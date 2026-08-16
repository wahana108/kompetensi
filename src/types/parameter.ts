import type { Activatable, Auditable } from "./common";

export type ParameterValueType = "string" | "number" | "boolean" | "json";

/** Parameter sistem yang dikelola dari Admin Panel. */
export interface SystemParameter extends Activatable, Auditable {
  id: string;
  key: string;
  value: string;
  valueType: ParameterValueType;
  description: string | null;
}
