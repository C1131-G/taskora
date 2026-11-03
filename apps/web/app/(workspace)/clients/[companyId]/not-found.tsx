import { NotFoundState } from "@/components/ui/not-found-state";

const ClientCompanyNotFound = () => (
  <NotFoundState
    description="The company may have been removed or the link may be wrong."
    href="/clients"
    linkText="Go to clients"
    title="Client company not found"
  />
);

export default ClientCompanyNotFound;
