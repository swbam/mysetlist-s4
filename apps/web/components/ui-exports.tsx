"use client";

// Temporary re-exports to fix TypeScript issues with design system components
// This helps Next.js properly type the components

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@repo/design-system/components/ui/avatar";

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";

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
} from "@repo/design-system/components/ui/dropdown-menu";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@repo/design-system/components/ui/table";

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";

export { Badge } from "@repo/design-system/components/ui/badge";
export { Button } from "@repo/design-system/components/ui/button";
export { Input } from "@repo/design-system/components/ui/input";
export { Label } from "@repo/design-system/components/ui/label";
export { Switch } from "@repo/design-system/components/ui/switch";
export { Textarea } from "@repo/design-system/components/ui/textarea";
export { Separator } from "@repo/design-system/components/ui/separator";
export { toast } from "@repo/design-system/components/ui/use-toast";
export {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
