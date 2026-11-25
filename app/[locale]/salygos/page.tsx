import { createLegalPage } from "@/components/legal/LegalPage";
import en from "@/content/legal/terms.en";
import lt from "@/content/legal/terms.lt";

export const revalidate = 300;

const { generateMetadata, Page } = createLegalPage("terms", "/salygos", { lt, en });

export { generateMetadata };
export default Page;
