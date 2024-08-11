import React from "react";

export default function Card({ children, width }: { children: React.ReactNode; width: string }) {
  return <div className={`py-10 px-7 bg-white shadow-2xl w-${width}`}>
    {children}
  </div>;
}
