import { Container } from "@/components/ui/Layout";
import { Ready } from "@/components/ui/Gate";
import { Benefits } from "./_home/Benefits";
import { CategoryGrid } from "./_home/CategoryGrid";
import { Hero } from "./_home/Hero";
import { HowItWorks } from "./_home/HowItWorks";
import { MostRented, NewNearby } from "./_home/ListingSections";
import { ProviderCta } from "./_home/ProviderCta";
import { NewNearbySkeleton, PopularSkeleton, TestimonialsSkeleton } from "./_home/Skeletons";
import { Testimonials } from "./_home/Testimonials";

/**
 * Landing page, in DESIGN.md › Desktop section order:
 * hero → categories → new nearby → benefits → most rented → how it works → testimonials → provider CTA (footer is in the layout).
 * Static sections render on the server; sections that read the demo data wait for hydration inside <Ready>.
 */
export default function Home() {
  return (
    <Container className="space-y-10 pt-3 sm:pt-5 lg:space-y-14 lg:pt-6">
      <Hero />
      <CategoryGrid />
      <Ready fallback={<NewNearbySkeleton />}>
        <NewNearby />
      </Ready>
      <Benefits />
      <Ready fallback={<PopularSkeleton />}>
        <MostRented />
      </Ready>
      <HowItWorks />
      <Ready fallback={<TestimonialsSkeleton />}>
        <Testimonials />
      </Ready>
      <ProviderCta />
    </Container>
  );
}
