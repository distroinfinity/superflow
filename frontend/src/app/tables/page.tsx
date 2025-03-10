import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import TableThree from "@/components/Tables/TableThree";
import TableTwo from "@/components/Tables/TableTwo";

import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import PortfolioTable from "@/components/Tables/PortfolioTable";

export const metadata: Metadata = {
  title: "redacted",
  description: "redacted: A portolio tracker for solana",
};

const TablesPage = () => {
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Tables" />

      <div className="flex flex-col gap-10">
        <PortfolioTable/>
        <TableTwo />
        <TableThree />
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;
