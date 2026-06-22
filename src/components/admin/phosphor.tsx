"use client";

// Client boundary for Phosphor icons (Phosphor uses React context, which can't be
// evaluated in the RSC server graph — so server components import them from here).
// Each icon is wrapped to apply a DEFAULT weight explicitly (no context reliance),
// and aliased to the lucide name it replaces so call sites stay unchanged.
import {
  ShoppingBag as PhShoppingBag,
  Clock as PhClock,
  Wrench as PhWrench,
  Bell as PhBell,
  Money as PhMoney,
  Package as PhPackage,
  Warning as PhWarning,
  TrendUp as PhTrendUp,
  ArrowUpRight as PhArrowUpRight,
  Users as PhUsers,
  Wallet as PhWallet,
  HardHat as PhHardHat,
  Headphones as PhHeadphones,
  Tray as PhTray,
  Check as PhCheck,
  X as PhX,
  PhoneSlash as PhPhoneSlash,
  Minus as PhMinus,
  Phone as PhPhone,
  PhoneX as PhPhoneX,
  type Icon,
  type IconProps,
} from "@phosphor-icons/react";

// Default look for every dashboard icon. One line to restyle them all:
// "fill" = bold solid · "duotone" = premium two-tone · "bold" · "regular" · "light".
const WEIGHT: IconProps["weight"] = "fill";

function styled(Inner: Icon, name: string) {
  function Styled(props: IconProps) {
    return <Inner weight={WEIGHT} {...props} />;
  }
  Styled.displayName = `Styled(${name})`;
  return Styled;
}

export const ShoppingBag = styled(PhShoppingBag, "ShoppingBag");
export const Clock = styled(PhClock, "Clock");
export const Wrench = styled(PhWrench, "Wrench");
export const Bell = styled(PhBell, "Bell");
export const Banknote = styled(PhMoney, "Banknote");
export const Package = styled(PhPackage, "Package");
export const AlertTriangle = styled(PhWarning, "AlertTriangle");
export const TrendingUp = styled(PhTrendUp, "TrendingUp");
export const ArrowUpRight = styled(PhArrowUpRight, "ArrowUpRight");
export const Users = styled(PhUsers, "Users");
export const Wallet = styled(PhWallet, "Wallet");
export const HardHat = styled(PhHardHat, "HardHat");
export const Headphones = styled(PhHeadphones, "Headphones");
export const Inbox = styled(PhTray, "Inbox");
export const Check = styled(PhCheck, "Check");
export const X = styled(PhX, "X");
export const PhoneOff = styled(PhPhoneSlash, "PhoneOff");
export const Minus = styled(PhMinus, "Minus");
export const Phone = styled(PhPhone, "Phone");
export const PhoneMissed = styled(PhPhoneX, "PhoneMissed");
