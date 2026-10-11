import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <Card>
        <CardHeader><CardTitle>Pilot</CardTitle></CardHeader>
        <CardContent>
          <p>This is the current plan. Booking, delivery proof, and quality logs are included.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Society Pro · ₹999 / month</CardTitle></CardHeader>
        <CardContent>
          <p>Society Pro is not connected yet. Payments are not taken in this version.</p>
        </CardContent>
      </Card>
    </div>
  );
}
