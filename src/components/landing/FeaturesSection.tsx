import { 
  Package, 
  BarChart3, 
  Users, 
  Shield, 
  Zap, 
  Globe,
  Layers,
  Bell
} from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Product Management",
    description: "Organize products with categories, variants, and custom attributes. Support for any business type.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track sales, monitor stock levels, and generate comprehensive reports with visual dashboards.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Super Admin, Admin, and Staff roles with granular permissions for complete control.",
  },
  {
    icon: Shield,
    title: "Multi-Company Isolation",
    description: "Each company's data is completely isolated. Perfect for franchise or multi-location businesses.",
  },
  {
    icon: Zap,
    title: "Fast & Responsive",
    description: "Lightning-fast performance across all devices. Works seamlessly on desktop, tablet, and mobile.",
  },
  {
    icon: Globe,
    title: "Multi-Currency & Tax",
    description: "Support for multiple currencies and tax rules at the category level for global operations.",
  },
  {
    icon: Layers,
    title: "Supplier Management",
    description: "Track suppliers, manage purchase orders, and maintain healthy stock levels automatically.",
  },
  {
    icon: Bell,
    title: "Activity Tracking",
    description: "Monitor all employee actions—logins, stock updates, orders, and more in real-time.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-background">
      <div className="container px-4">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Everything you need to manage
            <span className="gradient-text"> your inventory</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A complete suite of tools designed for modern businesses. From small shops to enterprise operations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border/50 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
