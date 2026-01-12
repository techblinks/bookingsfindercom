import { DollarSign, ShieldCheck, Handshake, Headphones } from "lucide-react";

const features = [
  {
    icon: DollarSign,
    title: "Best Prices Guaranteed",
    description: "We compare prices from hundreds of airlines and hotels to find you the lowest fares available.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Booking",
    description: "Your payments are protected with bank-level encryption. Book with confidence every time.",
  },
  {
    icon: Handshake,
    title: "Trusted Partners",
    description: "We work with top-rated airlines and hotel chains worldwide to ensure quality experiences.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our dedicated support team is available around the clock to assist you with any questions.",
  },
];

const WhyBookWithUs = () => {
  return (
    <section className="py-16 md:py-20 bg-card">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Why Book With Us
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
