
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import Overview from "@/components/Dashboard/Overview";

export const metadata: Metadata = {
  title: "redacted",
  description: "redacted: A portolio tracker for solana",
};

export default function Home() {
  return (
    <>
      <DefaultLayout>
        <Overview />
      </DefaultLayout>
    </>
  );
}
