import { ReactNode, useEffect, useState } from "react";
import { BarLoader } from "react-spinners";
import { Field, IconButton, Input, ListCollection, Popover, Portal, Switch } from "@chakra-ui/react";
import { LuInfo } from "react-icons/lu";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../ui/select";
import { Option } from "./timeWindow";

// Controls shared by the utilization and allocation views.

export interface ParamSelectProps {
  label: string;
  collection: ListCollection<Option>;
  value: string;
  onChange: (value: string) => void;
  width?: string;
}

export const ParamSelect = ({ label, collection, value, onChange, width = "180px" }: ParamSelectProps) => (
  <SelectRoot
    collection={collection}
    size="sm"
    width={width}
    value={[value]}
    onValueChange={(event) => onChange(event.value[0])}
  >
    <SelectLabel>{label}</SelectLabel>
    <SelectTrigger>
      <SelectValueText />
    </SelectTrigger>
    <SelectContent>
      {collection.items.map((item) => (
        <SelectItem item={item} key={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </SelectRoot>
);

export interface OptionSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  mb?: number;
}

// The root is a label, which Bootstrap's unlayered `label { display: inline-block }`
// would take over from Chakra's layered styles, so its flex layout is set inline.
export const OptionSwitch = ({ label, checked, onChange, mb }: OptionSwitchProps) => (
  <Switch.Root
    size="sm"
    mb={mb}
    checked={checked}
    onCheckedChange={(event) => onChange(event.checked)}
    style={{ display: "inline-flex" }}
  >
    <Switch.HiddenInput />
    <Switch.Control />
    <Switch.Label>{label}</Switch.Label>
  </Switch.Root>
);

export interface DateInputProps {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}

// A UTC date (yyyy-MM-dd); cleared inputs are ignored, as a range needs both ends.
export const DateInput = ({ label, value, min, max, onChange }: DateInputProps) => (
  <Field.Root width="150px">
    <Field.Label>{label}</Field.Label>
    <Input
      type="date"
      size="sm"
      value={value}
      min={min}
      max={max}
      onChange={(event) => event.target.value && onChange(event.target.value)}
    />
  </Field.Root>
);

export const InfoItem = ({ term, children }: { term: string; children: ReactNode }) => (
  <p style={{ marginTop: 6 }}>
    <strong>{term}</strong>: {children}
  </p>
);

// Explains the metrics of a view, in a popover opened by clicking an info icon.
export const InfoButton = ({ children }: { children: ReactNode }) => (
  <Popover.Root positioning={{ placement: "bottom-end" }}>
    <Popover.Trigger asChild>
      <IconButton aria-label="About these numbers" title="About these numbers" size="sm" variant="ghost">
        <LuInfo />
      </IconButton>
    </Popover.Trigger>
    <Portal>
      <Popover.Positioner>
        {/* scrolls rather than overflowing the window */}
        <Popover.Content width="420px" style={{ fontSize: 13, maxHeight: "70vh", overflowY: "auto" }}>
          <Popover.Arrow />
          <Popover.Body>
            <Popover.Title fontWeight="semibold">About these numbers</Popover.Title>
            {children}
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Portal>
  </Popover.Root>
);

// While a query loads: a bar, how long it has been loading, and how long it may take, e.g. "a year can take ...".
export const LoadingNote = ({ expected }: { expected: string }) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="my-3" style={{ color: "#52514e" }}>
      <BarLoader />
      Loading{seconds > 0 ? ` for ${seconds} s` : ""} - {expected}
    </div>
  );
};
