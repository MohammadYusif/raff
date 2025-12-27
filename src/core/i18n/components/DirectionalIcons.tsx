import {
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  ChevronsRight,
  ChevronsLeft,
  ArrowBigRight,
  ArrowBigLeft,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowDownRight,
  ArrowDownLeft,
  CornerUpRight,
  CornerUpLeft,
  CornerDownRight,
  CornerDownLeft,
  MoveRight,
  MoveLeft,
  StepForward,
  StepBack,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
  Play,
  RotateCcw,
  RotateCw,
  Undo,
  Redo,
  Reply,
  Forward,
  Share,
  TrendingUp,
  TrendingDown,
  LogIn,
  LogOut,
  Download,
  Upload,
  SendHorizontal,
} from "lucide-react";
import { useLocale } from "../hooks/useLocale";
import { ComponentProps } from "react";

type IconProps = ComponentProps<typeof ChevronRight>;

// Basic directional chevrons
export function ChevronForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ChevronLeft {...props} />
  ) : (
    <ChevronRight {...props} />
  );
}

export function ChevronBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ChevronRight {...props} />
  ) : (
    <ChevronLeft {...props} />
  );
}

// Double chevrons (first/last page navigation)
export function ChevronsForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ChevronsLeft {...props} />
  ) : (
    <ChevronsRight {...props} />
  );
}

export function ChevronsBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ChevronsRight {...props} />
  ) : (
    <ChevronsLeft {...props} />
  );
}

// Basic arrows
export function ArrowForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ArrowLeft {...props} />
  ) : (
    <ArrowRight {...props} />
  );
}

export function ArrowBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ArrowRight {...props} />
  ) : (
    <ArrowLeft {...props} />
  );
}

// Big arrows
export function ArrowBigForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ArrowBigLeft {...props} />
  ) : (
    <ArrowBigRight {...props} />
  );
}

export function ArrowBigBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ArrowBigRight {...props} />
  ) : (
    <ArrowBigLeft {...props} />
  );
}

// Diagonal arrows (up direction)
export function ArrowUpForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ArrowUpLeft {...props} />
  ) : (
    <ArrowUpRight {...props} />
  );
}

export function ArrowUpBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ArrowUpRight {...props} />
  ) : (
    <ArrowUpLeft {...props} />
  );
}

// Diagonal arrows (down direction)
export function ArrowDownForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ArrowDownLeft {...props} />
  ) : (
    <ArrowDownRight {...props} />
  );
}

export function ArrowDownBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <ArrowDownRight {...props} />
  ) : (
    <ArrowDownLeft {...props} />
  );
}

// Corner arrows
export function CornerUpForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <CornerUpLeft {...props} />
  ) : (
    <CornerUpRight {...props} />
  );
}

export function CornerUpBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <CornerUpRight {...props} />
  ) : (
    <CornerUpLeft {...props} />
  );
}

export function CornerDownForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <CornerDownLeft {...props} />
  ) : (
    <CornerDownRight {...props} />
  );
}

export function CornerDownBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <CornerDownRight {...props} />
  ) : (
    <CornerDownLeft {...props} />
  );
}

// Movement arrows
export function MoveForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <MoveLeft {...props} />
  ) : (
    <MoveRight {...props} />
  );
}

export function MoveBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <MoveRight {...props} />
  ) : (
    <MoveLeft {...props} />
  );
}

// Step controls
export function StepNext(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <StepBack {...props} />
  ) : (
    <StepForward {...props} />
  );
}

export function StepPrevious(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <StepForward {...props} />
  ) : (
    <StepBack {...props} />
  );
}

// Skip controls
export function SkipNext(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <SkipBack {...props} />
  ) : (
    <SkipForward {...props} />
  );
}

export function SkipPrevious(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <SkipForward {...props} />
  ) : (
    <SkipBack {...props} />
  );
}

// Media controls
export function FastNext(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <Rewind {...props} />
  ) : (
    <FastForward {...props} />
  );
}

export function FastPrevious(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <FastForward {...props} />
  ) : (
    <Rewind {...props} />
  );
}

// Rotation (clockwise becomes counter-clockwise in RTL)
export function RotateForward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <RotateCcw {...props} />
  ) : (
    <RotateCw {...props} />
  );
}

export function RotateBackward(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <RotateCw {...props} />
  ) : (
    <RotateCcw {...props} />
  );
}

// Undo/Redo
export function UndoAction(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <Redo {...props} />
  ) : (
    <Undo {...props} />
  );
}

export function RedoAction(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <Undo {...props} />
  ) : (
    <Redo {...props} />
  );
}

// Reply/Forward (email/messaging)
export function ReplyIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <Forward {...props} />
  ) : (
    <Reply {...props} />
  );
}

export function ForwardIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <Reply {...props} />
  ) : (
    <Forward {...props} />
  );
}

// Login/Logout
export function LoginIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <LogOut {...props} />
  ) : (
    <LogIn {...props} />
  );
}

export function LogoutIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <LogIn {...props} />
  ) : (
    <LogOut {...props} />
  );
}

// Import/Export concepts
export function ImportIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <Upload {...props} />
  ) : (
    <Download {...props} />
  );
}

export function ExportIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return currentConfig.dir === "rtl" ? (
    <Download {...props} />
  ) : (
    <Upload {...props} />
  );
}

// Send icon (horizontal version)
export function SendIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  // For send, we might want to flip the horizontal version
  return (
    <SendHorizontal
      {...props}
      style={{
        transform: currentConfig.dir === "rtl" ? "scaleX(-1)" : "none",
        ...props.style,
      }}
    />
  );
}

// Play button (triangle direction changes in RTL)
export function PlayIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return (
    <Play
      {...props}
      style={{
        transform: currentConfig.dir === "rtl" ? "scaleX(-1)" : "none",
        ...props.style,
      }}
    />
  );
}

// Share icon (arrow direction)
export function ShareIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return (
    <Share
      {...props}
      style={{
        transform: currentConfig.dir === "rtl" ? "scaleX(-1)" : "none",
        ...props.style,
      }}
    />
  );
}

// Trending indicators (might need flipping depending on context)
export function TrendingUpIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return (
    <TrendingUp
      {...props}
      style={{
        transform: currentConfig.dir === "rtl" ? "scaleX(-1)" : "none",
        ...props.style,
      }}
    />
  );
}

export function TrendingDownIcon(props: IconProps) {
  const { currentConfig } = useLocale();
  return (
    <TrendingDown
      {...props}
      style={{
        transform: currentConfig.dir === "rtl" ? "scaleX(-1)" : "none",
        ...props.style,
      }}
    />
  );
}
