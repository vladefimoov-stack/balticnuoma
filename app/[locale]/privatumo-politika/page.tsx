import { createLegalPage } from "@/components/legal/LegalPage";
import en from "@/content/legal/privacy.en";
import lt from "@/content/legal/privacy.lt";

export const revalidate = 300;

const { generateMetadata, Page } = createLegalPage("privacy", "/privatumo-politika", { lt, en });

export { generateMetadata };
export default Page;
