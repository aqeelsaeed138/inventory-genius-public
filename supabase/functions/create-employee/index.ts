import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateEmployeeRequest {
  email: string;
  password: string;
  fullName: string;
  role: "staff" | "accountant";
  companyId: string;
  invitedBy: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the user's token to verify they're an admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the requesting user
    const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, fullName, role, companyId, invitedBy }: CreateEmployeeRequest = await req.json();

    // Validate required fields
    if (!email || !password || !fullName || !companyId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin of the company
    const { data: userRole, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (roleError || !userRole || (userRole.role !== "admin" && userRole.role !== "super_admin")) {
      return new Response(
        JSON.stringify({ error: "Only admins can add employees" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the new user using admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // Update the profile with company info
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        company_id: companyId,
        full_name: fullName,
        invited_by: invitedBy,
        invited_at: new Date().toISOString(),
      })
      .eq("id", newUserId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Continue anyway, profile will be created by trigger
    }

    // Assign the role
    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUserId,
        company_id: companyId,
        role: role || "staff",
      });

    if (roleInsertError) {
      console.error("Role insert error:", roleInsertError);
      // Clean up the user if role insert fails
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Failed to assign role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the activity
    await adminClient.from("activity_logs").insert({
      company_id: companyId,
      user_id: invitedBy,
      action: "employee_added",
      entity_type: "employee",
      entity_id: newUserId,
      details: { employee_name: fullName, role },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUserId, 
          email: authData.user.email,
          full_name: fullName,
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in create-employee function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
