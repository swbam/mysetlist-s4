"use client";

// Temporary re-exports to fix TypeScript issues with design system components
// This helps Next.js properly type the components

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@repo/design-system/avatar";

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/tabs";

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@repo/design-system/dropdown-menu";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@repo/design-system/table";

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/select";

export { Badge } from "@repo/design-system/badge";
export { Button } from "@repo/design-system/button";
export { Input } from "@repo/design-system/input";
export { Label } from "@repo/design-system/label";
export { Switch } from "@repo/design-system/switch";
export { Textarea } from "@repo/design-system/textarea";
export { Separator } from "@repo/design-system/separator";
export { toast } from "@repo/design-system/use-toast";
export {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/dialog";
