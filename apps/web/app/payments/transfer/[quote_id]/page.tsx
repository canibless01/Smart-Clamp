import UnavailableFeature from "@/components/UnavailableFeature";
export default function Page() {
  return (
    <UnavailableFeature
      title="Bank transfer collection"
      description="Dedicated bank-transfer collection is not configured. Use the provider-hosted checkout from billing. No bank account or payment instruction is issued by this page."
    />
  );
}
