import { forwardRef, type ForwardRefExoticComponent, type RefAttributes, type SVGProps } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  Award01Icon,
  BookOpen01Icon,
  Calendar03Icon,
  CalendarCheck01Icon,
  Camera01Icon,
  Cancel01Icon,
  CancelCircleIcon,
  Chat01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Coins01Icon,
  Copy01Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  Download01Icon,
  FavouriteIcon,
  Fire02Icon,
  FuelStationIcon,
  GiftIcon,
  HeartbreakIcon,
  Home01Icon,
  InformationCircleIcon,
  KeyboardIcon,
  LinkSquare02Icon,
  Loading03Icon,
  LockIcon,
  Logout01Icon,
  Mail01Icon,
  Medal01Icon,
  Mic01Icon,
  MinusSignIcon,
  Notification01Icon,
  PauseCircleIcon,
  PiggyBankIcon,
  PlayCircleIcon,
  PlayIcon,
  PlusSignIcon,
  PlusSignSquareIcon,
  Refresh01Icon,
  RotateLeft01Icon,
  SafeBoxIcon,
  ScanFaceIcon,
  Search01Icon,
  SecurityCheckIcon,
  SentIcon,
  Share01Icon,
  SlidersHorizontalIcon,
  SmartPhone01Icon,
  SnowflakeIcon,
  SparklesIcon,
  Target01Icon,
  Tick02Icon,
  TrophyIcon,
  UnfoldMoreIcon,
  UserGroupIcon,
  UserIcon,
  VolumeHighIcon,
  VolumeMute01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

/**
 * The app's icons, from Hugeicons (the free, rounded outline set). Every icon is exported under the name the app already uses,
 * so a screen imports from here and nothing else. Defaults follow the design system: 1.75 stroke, rounded caps and joins.
 * These icons are outlines. To fill one (a heart that is full), give the svg a `[&_path]:fill-*` class.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number | string; strokeWidth?: number };
export type IconType = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

function make(icon: IconSvgElement, name: string): IconType {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon({ size = 24, strokeWidth = 1.75, ...rest }, ref) {
    return <HugeiconsIcon ref={ref} icon={icon} size={size} strokeWidth={strokeWidth} {...rest} />;
  });
  Icon.displayName = name;
  return Icon;
}

export const AlertCircle = make(AlertCircleIcon, "AlertCircle");
export const ArrowDown = make(ArrowDown02Icon, "ArrowDown");
export const ArrowLeft = make(ArrowLeft02Icon, "ArrowLeft");
export const ArrowRight = make(ArrowRight02Icon, "ArrowRight");
export const ArrowUp = make(ArrowUp02Icon, "ArrowUp");
export const ArrowUpRight = make(ArrowUpRight01Icon, "ArrowUpRight");
export const Award = make(Award01Icon, "Award");
export const BadgeCheck = make(CheckmarkBadge01Icon, "BadgeCheck");
export const Bell = make(Notification01Icon, "Bell");
export const BookOpen = make(BookOpen01Icon, "BookOpen");
export const CalendarCheck = make(CalendarCheck01Icon, "CalendarCheck");
export const CalendarDays = make(Calendar03Icon, "CalendarDays");
export const Camera = make(Camera01Icon, "Camera");
export const Check = make(Tick02Icon, "Check");
export const CheckCircle2 = make(CheckmarkCircle02Icon, "CheckCircle2");
export const ChevronDown = make(ArrowDown01Icon, "ChevronDown");
export const ChevronLeft = make(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = make(ArrowRight01Icon, "ChevronRight");
export const ChevronsUpDown = make(UnfoldMoreIcon, "ChevronsUpDown");
export const Clock = make(Clock01Icon, "Clock");
export const Coins = make(Coins01Icon, "Coins");
export const Copy = make(Copy01Icon, "Copy");
export const Download = make(Download01Icon, "Download");
export const ExternalLink = make(LinkSquare02Icon, "ExternalLink");
export const Flame = make(Fire02Icon, "Flame");
export const Fuel = make(FuelStationIcon, "Fuel");
export const Gift = make(GiftIcon, "Gift");
export const Heart = make(FavouriteIcon, "Heart");
export const HeartCrack = make(HeartbreakIcon, "HeartCrack");
export const Home = make(Home01Icon, "Home");
export const Info = make(InformationCircleIcon, "Info");
export const Keyboard = make(KeyboardIcon, "Keyboard");
export const LayoutDashboard = make(DashboardSquare01Icon, "LayoutDashboard");
export const Loader2 = make(Loading03Icon, "Loader2");
export const Lock = make(LockIcon, "Lock");
export const LogOut = make(Logout01Icon, "LogOut");
export const Mail = make(Mail01Icon, "Mail");
export const Medal = make(Medal01Icon, "Medal");
export const MessageCircle = make(Chat01Icon, "MessageCircle");
export const Mic = make(Mic01Icon, "Mic");
export const Minus = make(MinusSignIcon, "Minus");
export const PauseCircle = make(PauseCircleIcon, "PauseCircle");
export const PiggyBank = make(PiggyBankIcon, "PiggyBank");
export const Play = make(PlayIcon, "Play");
export const PlayCircle = make(PlayCircleIcon, "PlayCircle");
export const Plus = make(PlusSignIcon, "Plus");
export const PlusSquare = make(PlusSignSquareIcon, "PlusSquare");
export const RefreshCw = make(Refresh01Icon, "RefreshCw");
export const RotateCcw = make(RotateLeft01Icon, "RotateCcw");
export const ScanFace = make(ScanFaceIcon, "ScanFace");
export const Search = make(Search01Icon, "Search");
export const Send = make(SentIcon, "Send");
export const SendHorizontal = make(SentIcon, "SendHorizontal");
export const Share = make(Share01Icon, "Share");
export const ShieldCheck = make(SecurityCheckIcon, "ShieldCheck");
export const SlidersHorizontal = make(SlidersHorizontalIcon, "SlidersHorizontal");
export const Smartphone = make(SmartPhone01Icon, "Smartphone");
export const Snowflake = make(SnowflakeIcon, "Snowflake");
export const Sparkles = make(SparklesIcon, "Sparkles");
export const Target = make(Target01Icon, "Target");
export const Trash2 = make(Delete02Icon, "Trash2");
export const Trophy = make(TrophyIcon, "Trophy");
export const UserRound = make(UserIcon, "UserRound");
export const Users = make(UserGroupIcon, "Users");
export const Vault = make(SafeBoxIcon, "Vault");
export const Volume2 = make(VolumeHighIcon, "Volume2");
export const VolumeX = make(VolumeMute01Icon, "VolumeX");
export const Wallet = make(Wallet01Icon, "Wallet");
export const X = make(Cancel01Icon, "X");
export const XCircle = make(CancelCircleIcon, "XCircle");
