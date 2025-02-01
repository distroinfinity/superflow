"use client";
import React from "react";
import PortfolioTable from "../Tables/PortfolioTable";
const Overview: React.FC = () => {
  return (
    <>
      <div className="flex flex-col gap-10">
        <PortfolioTable />
      </div>
    </>
  );
};

export default Overview;
