import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TripCostPlanner } from "@/components/trip-cost/TripCostPlanner";

const TripCostPlannerPage = () => {
  return (
    <>
      <Helmet>
        <title>Trip Budget Planner — Estimate the Full Cost of Your Trip</title>
        <meta
          name="description"
          content="Plan the full cost of your trip with flights, accommodation, daily spending, insurance, activities and contingency in one editable budget."
        />
        <meta property="og:title" content="Trip Budget Planner — BookingsFinder" />
        <meta property="og:description" content="Plan the full cost of your trip with flights, accommodation, daily spending, insurance, activities and contingency." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://bookingsfinder.com/trip-cost" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        {/* Skip link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-3 focus:bg-background focus:text-foreground focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Skip to main content
        </a>

        <Header />

        <main id="main-content" className="flex-1">
          {/* Breadcrumb */}
          <div className="container max-w-7xl mx-auto px-4 pt-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Trip Budget Planner</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Page heading */}
          <div className="container max-w-7xl mx-auto px-4 pt-6 pb-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Plan the full cost of your trip.
            </h1>
            <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl">
              Add flights, accommodation, daily spending and other travel costs to build a complete trip budget.
            </p>
            <p className="mt-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 max-w-2xl leading-relaxed">
              This planner uses the amounts you enter. It does not provide live prices or guarantee what your trip will cost.
            </p>
          </div>

          {/* Planner */}
          <TripCostPlanner />

          {/* Educational note */}
          <div className="container max-w-7xl mx-auto px-4 py-8">
            <p className="text-sm text-muted-foreground text-center max-w-xl mx-auto leading-relaxed">
              Your trip data is saved in this browser only. It is not sent to our servers. All cost values are entered by you — no live pricing is involved.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TripCostPlannerPage;
