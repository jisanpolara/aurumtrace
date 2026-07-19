import { apiGet, type ApiCustomerRow } from "@/lib/api";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { CustomersTable } from "./customers-table";

export default async function CustomersPage() {
  const customers = await apiGet<ApiCustomerRow[]>("/customers");
  if (customers === null) return <ComingSoon titleKey="nav.customers" />;
  return (
    <div className="animate-at-rise">
      <CustomersTable customers={customers} />
    </div>
  );
}
