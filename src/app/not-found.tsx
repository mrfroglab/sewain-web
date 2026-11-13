import { ButtonLink } from "@/components/ui/Button";
import { Container, EmptyState } from "@/components/ui/Layout";

export default function NotFound() {
  return (
    <Container className="py-16">
      <EmptyState title="Halaman tidak ditemukan" description="Mungkin barangnya sudah tidak disewakan, atau tautannya salah." action={<ButtonLink href="/">Kembali ke beranda</ButtonLink>} />
    </Container>
  );
}
