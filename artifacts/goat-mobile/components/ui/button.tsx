import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { Pressable, type PressableProps, type ViewStyle } from "react-native";
import { cn } from "@/lib/utils";

const buttonVariants = cva("min-h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5", {
  variants: {
    variant: { primary: "bg-primary", outline: "border border-primary bg-transparent", paper: "bg-white" },
    disabled: { true: "opacity-45", false: "" },
  },
  defaultVariants: { variant: "primary", disabled: false },
});

type ButtonProps = PressableProps & VariantProps<typeof buttonVariants> & { className?: string; style?: ViewStyle };

export function Button({ className, disabled, variant, style, ...props }: ButtonProps) {
  return <Pressable accessibilityRole="button" disabled={disabled} className={cn(buttonVariants({ variant, disabled }), className)} style={style} {...props} />;
}
