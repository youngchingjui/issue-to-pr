"use client"

import { TableRow } from "@/components/ui/table";
import * as React from "react";

interface DataRowProps {
  children: React.ReactNode;
  // (optional: future layout/load state props)
}

/**
 * DataRow: Thin wrapper for a styled <TableRow> that lets you compose any <TableCell>s as children.
 */
export default function DataRow({ children }: DataRowProps) {
  return <TableRow>{children}</TableRow>;
}
