import type { ComponentType } from "react";
import Osi from "./fundamentals/Osi";
import IpAddressing from "./fundamentals/IpAddressing";
import Subnetting from "./fundamentals/Subnetting";
import Ports from "./fundamentals/Ports";
import MacArp from "./fundamentals/MacArp";

export const LESSONS: Record<string, ComponentType> = {
  "fundamentals/osi": Osi,
  "fundamentals/ip-addressing": IpAddressing,
  "fundamentals/subnetting": Subnetting,
  "fundamentals/ports": Ports,
  "fundamentals/mac-arp": MacArp,
};
