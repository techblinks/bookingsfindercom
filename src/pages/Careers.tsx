import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Briefcase } from "lucide-react";

const Careers = () => {
  const openPositions = [
    {
      title: "Senior Full-Stack Developer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description: "Build and scale our travel comparison platform using React, TypeScript, and cloud technologies.",
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
      description: "Create intuitive and beautiful user experiences for millions of travelers worldwide.",
    },
    {
      title: "Data Analyst",
      department: "Analytics",
      location: "Remote",
      type: "Full-time",
      description: "Analyze travel trends and user behavior to drive product decisions and partnerships.",
    },
    {
      title: "Customer Success Manager",
      department: "Support",
      location: "Remote",
      type: "Full-time",
      description: "Help our users get the most out of BookingsFinder and resolve any issues they encounter.",
    },
  ];

  const benefits = [
    "Competitive salary and equity",
    "Fully remote work",
    "Unlimited PTO",
    "Health, dental, and vision insurance",
    "Home office stipend",
    "Learning and development budget",
    "Travel credits",
    "Flexible working hours",
  ];

  return (
    <>
      <Helmet>
        <title>Careers | BookingsFinder</title>
        <meta name="description" content="Join the BookingsFinder team and help millions of travelers find the best deals. View our open positions and apply today." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
            <div className="container text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Join Our Team</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Help us revolutionize travel by making it more accessible and affordable for everyone. We're always looking for talented people to join our mission.
              </p>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">Why Work With Us?</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Open Positions */}
          <section className="py-16 bg-muted/50">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">Open Positions</h2>
              <div className="max-w-3xl mx-auto space-y-4">
                {openPositions.map((position, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl">{position.title}</CardTitle>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {position.department}
                            </Badge>
                            <Badge variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              {position.location}
                            </Badge>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {position.type}
                            </Badge>
                          </div>
                        </div>
                        <Button>Apply Now</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{position.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16">
            <div className="container text-center">
              <h2 className="text-2xl font-bold mb-4">Don't see the right role?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                We're always interested in meeting talented people. Send us your resume and we'll keep you in mind for future opportunities.
              </p>
              <Button variant="outline" size="lg">
                Send Your Resume
              </Button>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Careers;
