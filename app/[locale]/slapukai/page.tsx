import { createLegalPage } from "@/components/legal/LegalPage";
import en from "@/content/legal/cookies.en";
import lt from "@/content/legal/cookies.lt";

export const revalidate = 300;

const { generateMetadata, Page } = createLegalPage("cookies", "/slapukai", { lt, en });

export { generateMetadata };
export default Page;
