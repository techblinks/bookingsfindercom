import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CountryPageData {
  id: string;
  slug: string;
  type: "flights" | "hotels";
  country_name: string;
  country_code: string;
  title: string;
  meta_description: string;
  h1_title: string;
  intro_paragraph: string;
  main_content: string;
  popular_cities: { name: string; code: string; slug?: string }[];
  popular_routes: { from: string; to: string; slug?: string }[];
  travel_tips: { title: string; content: string }[];
  faqs: { question: string; answer: string }[];
  is_published: boolean;
}

export const useCountryPage = (slug: string | undefined) => {
  const [data, setData] = useState<CountryPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setIsLoading(false);
        setError("No slug provided");
        return;
      }

      try {
        const { data: pageData, error: fetchError } = await supabase
          .from("country_landing_pages")
          .select("*")
          .eq("slug", slug)
          .eq("is_published", true)
          .single();

        if (fetchError) {
          setError("Page not found");
          setData(null);
        } else {
          setData({
            ...pageData,
            type: pageData.type as "flights" | "hotels",
            popular_cities: (pageData.popular_cities as any[]) || [],
            popular_routes: (pageData.popular_routes as any[]) || [],
            travel_tips: (pageData.travel_tips as any[]) || [],
            faqs: (pageData.faqs as any[]) || [],
          });
          setError(null);
        }
      } catch (err) {
        setError("Failed to load page");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  return { data, isLoading, error };
};
