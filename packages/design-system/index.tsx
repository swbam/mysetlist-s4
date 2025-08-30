import { AuthProvider } from "@repo/auth/provider";
import type { ThemeProviderProps } from "next-themes";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./providers/theme";

type DesignSystemProviderProperties = ThemeProviderProps & {
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
};

export const DesignSystemProvider = ({
  children,
  privacyUrl,
  termsUrl,
  helpUrl,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <AuthProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </AuthProvider>
  </ThemeProvider>
);

// Music-specific components
export { ArtistCard } from "./components/ui/artist-card";
export { ArtistGrid } from "./components/ui/artist-grid";
export { VenueCard } from "./components/ui/venue-card";
export { SetlistSong } from "./components/ui/setlist-song";
export { VoteButton } from "./components/ui/vote-button";
export { SearchBox } from "./components/ui/search-box";

// Additional UI components
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area";
export { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
export { Button } from "./components/ui/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "./components/ui/card";
export { Badge } from "./components/ui/badge";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
export { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/ui/table";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from "./components/ui/form";
export { Input } from "./components/ui/input";
export { Label } from "./components/ui/label";
export { Textarea } from "./components/ui/textarea";
export { Switch } from "./components/ui/switch";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";

// Music design tokens
export { musicTokens, type MusicTokens } from "./lib/design-tokens";

// Utilities
export { cn, capitalize, handleError } from "./lib/utils";

// Hooks
export { useToast } from "./hooks/use-toast";
export { toast } from "./components/ui/use-toast";
export { useIsMobile } from "./hooks/use-mobile.js";
