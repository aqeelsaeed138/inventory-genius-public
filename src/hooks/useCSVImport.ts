import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CSVProduct {
  name: string;
  price: number;
  cost_price: number;
  quantity: number;
  category: string;
  supplier: string;
  // Metadata
  exists: boolean;
  existingId?: string;
  existingQuantity?: number;
  newCategory: boolean;
  newSupplier: boolean;
  categoryId?: string;
  supplierId?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  categoriesCreated: number;
  suppliersCreated: number;
  newSupplierNames: string[];
  errors: string[];
}

const REQUIRED_COLUMNS = ["product_name", "quantity"];

export const useCSVImport = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const parseCSV = (content: string): Record<string, string>[] => {
    const lines = content.split("\n").map(line => line.trim()).filter(line => line);
    if (lines.length < 2) throw new Error("CSV file must have a header row and at least one data row");

    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/__+/g, "_"));
    
    // Normalize header aliases
    const headerMap: Record<string, string> = {
      "product_name": "product_name",
      "name": "product_name",
      "selling_price": "selling_price",
      "price": "selling_price",
      "cost_price": "cost_price",
      "quantity": "quantity",
      "qty": "quantity",
      "category_name": "category_name",
      "category": "category_name",
      "supplier_name": "supplier_name",
      "supplier": "supplier_name",
    };

    const normalizedHeaders = headers.map(h => headerMap[h] || h);

    const missingColumns = REQUIRED_COLUMNS.filter(col => !normalizedHeaders.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(", ")}. Expected: product_name, selling_price, cost_price, quantity, category_name, supplier_name`);
    }

    const data: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i]);
      if (values.length !== normalizedHeaders.length) {
        console.warn(`Row ${i + 1} has ${values.length} values, expected ${normalizedHeaders.length}`);
        continue;
      }
      
      const row: Record<string, string> = {};
      normalizedHeaders.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      
      if (!row.product_name?.trim()) continue;
      
      data.push(row);
    }

    if (data.length === 0) throw new Error("No valid data rows found in CSV");
    
    return data;
  };

  const validateAndPreview = useCallback(async (file: File): Promise<CSVProduct[]> => {
    if (!profile?.company_id) throw new Error("Company not found");
    if (file.size > 5 * 1024 * 1024) throw new Error("File size must be less than 5MB");
    if (!file.name.endsWith(".csv")) throw new Error("File must be a CSV");

    const content = await file.text();
    const rows = parseCSV(content);

    const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, sku, name, quantity")
        .eq("company_id", profile.company_id),
      supabase
        .from("categories")
        .select("id, name")
        .eq("company_id", profile.company_id),
      supabase
        .from("suppliers")
        .select("id, name")
        .eq("company_id", profile.company_id),
    ]);

    const existingProducts = productsRes.data || [];
    const existingCategories = categoriesRes.data || [];
    const existingSuppliers = suppliersRes.data || [];

    const productByName = new Map(
      existingProducts.map(p => [p.name.toLowerCase(), p])
    );
    const categoryByName = new Map(
      existingCategories.map(c => [c.name.toLowerCase(), c])
    );
    const supplierByName = new Map(
      existingSuppliers.map(s => [s.name.toLowerCase(), s])
    );

    const processed: CSVProduct[] = rows.map(row => {
      const name = row.product_name?.trim();
      const categoryName = row.category_name?.trim();
      const supplierName = row.supplier_name?.trim();

      const existingProduct = name ? productByName.get(name.toLowerCase()) : null;
      const existingCategory = categoryName ? categoryByName.get(categoryName.toLowerCase()) : null;
      const existingSupplier = supplierName ? supplierByName.get(supplierName.toLowerCase()) : null;

      return {
        name: name || "",
        price: parseFloat(row.selling_price) || 0,
        cost_price: parseFloat(row.cost_price) || 0,
        quantity: parseInt(row.quantity) || 0,
        category: categoryName || "",
        supplier: supplierName || "",
        exists: !!existingProduct,
        existingId: existingProduct?.id,
        existingQuantity: existingProduct?.quantity,
        newCategory: !!categoryName && !existingCategory,
        newSupplier: !!supplierName && !existingSupplier,
        categoryId: existingCategory?.id,
        supplierId: existingSupplier?.id,
      };
    });

    return processed;
  }, [profile?.company_id]);

  const importProducts = useCallback(async (products: CSVProduct[]): Promise<ImportResult> => {
    if (!profile?.company_id) throw new Error("Company not found");
    
    setIsImporting(true);
    setProgress(0);

    const result: ImportResult = {
      created: 0,
      updated: 0,
      categoriesCreated: 0,
      suppliersCreated: 0,
      newSupplierNames: [],
      errors: [],
    };

    try {
      // Step 1: Create new categories
      const newCategories = [...new Set(
        products.filter(p => p.newCategory && p.category).map(p => p.category.toLowerCase())
      )];

      const categoryMap = new Map<string, string>();
      products.forEach(p => {
        if (p.categoryId) categoryMap.set(p.category.toLowerCase(), p.categoryId);
      });

      if (newCategories.length > 0) {
        const categoriesToInsert = newCategories.map(name => ({
          name: products.find(p => p.category.toLowerCase() === name)!.category,
          company_id: profile.company_id,
        }));

        const { data: createdCategories, error } = await supabase
          .from("categories")
          .insert(categoriesToInsert)
          .select("id, name");

        if (error) {
          result.errors.push(`Failed to create categories: ${error.message}`);
        } else if (createdCategories) {
          result.categoriesCreated = createdCategories.length;
          createdCategories.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));
        }
      }

      setProgress(20);

      // Step 2: Create new suppliers (with name only, empty details)
      const newSuppliers = [...new Set(
        products.filter(p => p.newSupplier && p.supplier).map(p => p.supplier.toLowerCase())
      )];

      const supplierMap = new Map<string, string>();
      products.forEach(p => {
        if (p.supplierId) supplierMap.set(p.supplier.toLowerCase(), p.supplierId);
      });

      if (newSuppliers.length > 0) {
        const suppliersToInsert = newSuppliers.map(name => ({
          name: products.find(p => p.supplier.toLowerCase() === name)!.supplier,
          company_id: profile.company_id,
        }));

        const { data: createdSuppliers, error } = await supabase
          .from("suppliers")
          .insert(suppliersToInsert)
          .select("id, name");

        if (error) {
          result.errors.push(`Failed to create suppliers: ${error.message}`);
        } else if (createdSuppliers) {
          result.suppliersCreated = createdSuppliers.length;
          result.newSupplierNames = createdSuppliers.map(s => s.name);
          createdSuppliers.forEach(s => supplierMap.set(s.name.toLowerCase(), s.id));
        }
      }

      setProgress(40);

      // Step 3: Update existing products (add quantity to existing stock)
      const productsToUpdate = products.filter(p => p.exists && p.existingId);
      
      for (let i = 0; i < productsToUpdate.length; i++) {
        const product = productsToUpdate[i];
        const newQuantity = (product.existingQuantity || 0) + product.quantity;

        const updateData: Record<string, unknown> = { quantity: newQuantity };
        if (product.price) updateData.price = product.price;
        if (product.cost_price) updateData.cost_price = product.cost_price;

        const { error } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", product.existingId!);

        if (error) {
          result.errors.push(`Failed to update ${product.name}: ${error.message}`);
        } else {
          result.updated++;
        }

        setProgress(40 + Math.floor((i / productsToUpdate.length) * 30));
      }

      setProgress(70);

      // Step 4: Create new products in batches
      const productsToCreate = products.filter(p => !p.exists);
      const batchSize = 50;
      
      for (let i = 0; i < productsToCreate.length; i += batchSize) {
        const batch = productsToCreate.slice(i, i + batchSize);
        
        const productsData = batch.map(p => ({
          name: p.name,
          price: p.price,
          cost_price: p.cost_price,
          quantity: p.quantity,
          min_stock_level: 10,
          category_id: p.category ? categoryMap.get(p.category.toLowerCase()) : null,
          supplier_id: p.supplier ? supplierMap.get(p.supplier.toLowerCase()) : null,
          company_id: profile.company_id,
        }));

        const { data, error } = await supabase
          .from("products")
          .insert(productsData)
          .select("id");

        if (error) {
          result.errors.push(`Batch insert failed: ${error.message}`);
        } else if (data) {
          result.created += data.length;
        }

        setProgress(70 + Math.floor(((i + batch.length) / productsToCreate.length) * 30));
      }

      setProgress(100);

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      toast.success(`Import complete: ${result.created} created, ${result.updated} updated`);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      result.errors.push(message);
      toast.error(message);
      throw error;
    } finally {
      setIsImporting(false);
    }
  }, [profile?.company_id, queryClient]);

  return {
    validateAndPreview,
    importProducts,
    isImporting,
    progress,
  };
};
