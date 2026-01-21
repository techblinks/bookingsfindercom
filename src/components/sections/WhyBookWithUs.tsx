import { DollarSign, ShieldCheck, Handshake, Search } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Compare & Save",
    description: "We search hundreds of travel sites to help you find and compare the best prices available.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Partners",
    description: "We only link to trusted, verified booking partners so you can compare with confidence.",
  },
  {
    icon: Handshake,
    title: "Trusted Network",
    description: "We partner with top-rated airlines and hotel booking sites worldwide for quality options.",
  },
  {
    icon: DollarSign,
    title: "No Hidden Fees",
    description: "Our comparison service is completely free. We earn from partners when you complete bookings.",
  },
];

const WhyBookWithUs = () => {
  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Why Compare With Us
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Millions of travelers trust us to find the best deals and provide exceptional service.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyBookWithUs;
