import { Button } from "@/components/ui/button";

export function WhatsAppShare({ href }: { href: string }) {
  return (
    <Button variant="outline" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        Share on WhatsApp
      </a>
    </Button>
  );
}
