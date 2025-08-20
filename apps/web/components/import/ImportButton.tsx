"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertCircle,
  ChevronDown,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface ImportButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  onImportStart?: (artistId: string, slug: string) => void;
  onImportError?: (error: string) => void;
  showDropdown?: boolean;
  compact?: boolean;
}

interface ImportMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  placeholder: string;
  example: string;
}

const IMPORT_METHODS: ImportMethod[] = [
  {
    id: "ticketmaster-id",
    name: "Ticketmaster ID",
    description: "Direct import using Ticketmaster attraction ID",
    icon: <Download className="h-4 w-4" />,
    placeholder: "Enter Ticketmaster attraction ID (e.g., K8vZ917G7x7)",
    example: "K8vZ917G7x7",
  },
  {
    id: "ticketmaster-url",
    name: "Ticketmaster URL",
    description: "Import from Ticketmaster artist page URL",
    icon: <ExternalLink className="h-4 w-4" />,
    placeholder: "Paste Ticketmaster artist URL",
    example: "https://www.ticketmaster.com/artist/12345",
  },
  {
    id: "artist-name",
    name: "Artist Name Search",
    description: "Search and import by artist name",
    icon: <Search className="h-4 w-4" />,
    placeholder: "Enter artist name to search",
    example: "Taylor Swift",
  },
];

export function ImportButton({
  variant = "default",
  size = "default",
  className,
  disabled = false,
  onImportStart,
  onImportError,
  showDropdown = false,
  compact = false,
}: ImportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod>(
    IMPORT_METHODS[0] || {
      id: "ticketmaster-id",
      name: "Ticketmaster ID",
      description: "Direct import using Ticketmaster attraction ID",
      icon: <Download className="h-4 w-4" />,
      placeholder: "Enter Ticketmaster Attraction ID",
      example: "K8vZ917G7x7",
    },
  );
  const [inputValue, setInputValue] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Extract Ticketmaster ID from URL or direct ID
  const extractTicketmasterId = (input: string): string | null => {
    const trimmed = input.trim();

    // Direct ID format (alphanumeric)
    if (/^[A-Za-z0-9]{10,}$/.test(trimmed)) {
      return trimmed;
    }

    // URL format - extract ID from various Ticketmaster URL patterns
    const urlPatterns = [
      /ticketmaster\.com\/.*\/artist\/([A-Za-z0-9]+)/,
      /ticketmaster\.com\/.*attraction\/([A-Za-z0-9]+)/,
      /tm\.com\/.*\/artist\/([A-Za-z0-9]+)/,
    ];

    for (const pattern of urlPatterns) {
      const match = trimmed.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    return null;
  };

  // Handle import submission
  const handleImport = useCallback(async () => {
    if (!inputValue.trim()) {
      setError("Please enter a value");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      let tmAttractionId: string | null = null;

      if (
        selectedMethod.id === "ticketmaster-id" ||
        selectedMethod.id === "ticketmaster-url"
      ) {
        tmAttractionId = extractTicketmasterId(inputValue);
        if (!tmAttractionId) {
          throw new Error("Invalid Ticketmaster ID or URL format");
        }
      } else if (selectedMethod.id === "artist-name") {
        // For artist name search, we'll need to implement search first
        // For now, show a helpful error
        throw new Error(
          "Artist name search not yet implemented. Please use Ticketmaster ID or URL.",
        );
      }

      if (!tmAttractionId) {
        throw new Error("Could not extract Ticketmaster ID");
      }

      // Call the import API
      const response = await fetch("/api/artists/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tmAttractionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // Close dialog and notify parent
      setIsDialogOpen(false);
      setInputValue("");
      onImportStart?.(result.artistId, result.slug);

      // Navigate to the artist page to show progress
      router.push(`/artists/${result.slug}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Import failed";
      setError(errorMessage);
      onImportError?.(errorMessage);
      console.error("[ImportButton] Import failed:", err);
    } finally {
      setIsImporting(false);
    }
  }, [inputValue, selectedMethod.id, onImportStart, onImportError, router]);

  // Reset dialog state when closed
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setInputValue("");
      setError(null);
      setSelectedMethod(
        IMPORT_METHODS[0] || {
          id: "ticketmaster-id",
          name: "Ticketmaster ID",
          description: "Direct import using Ticketmaster attraction ID",
          icon: <Download className="h-4 w-4" />,
          placeholder: "Enter Ticketmaster Attraction ID",
          example: "K8vZ917G7x7",
        },
      );
    }
  };

  const buttonContent = (
    <>
      <Plus className="h-4 w-4" />
      {!compact && <span>Import Artist</span>}
    </>
  );

  if (showDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn("gap-2", className)}
            disabled={disabled}
          >
            {buttonContent}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">Import Artist</div>
              <div className="text-xs text-muted-foreground">
                Add new artist to the platform
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Sparkles className="h-4 w-4 mr-2" />
            <div>
              <div className="font-medium">Bulk Import</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button
                  variant={variant}
                  size={size}
                  className={cn("gap-2", className)}
                  disabled={disabled}
                >
                  {buttonContent}
                </Button>
              </DialogTrigger>
            </Dialog>
          </TooltipTrigger>
          <TooltipContent>
            <p>Import a new artist to the platform</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Import New Artist
            </DialogTitle>
            <DialogDescription>
              Add a new artist to the platform. This will import their shows,
              songs, and venue information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Import Method Selector */}
            <div className="space-y-2">
              <Label htmlFor="method">Import Method</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      {selectedMethod.icon}
                      <span>{selectedMethod.name}</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  {IMPORT_METHODS.map((method) => (
                    <DropdownMenuItem
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method);
                        setInputValue("");
                        setError(null);
                      }}
                      disabled={method.id === "artist-name"} // Disable until implemented
                    >
                      <div className="flex items-start gap-2 w-full">
                        {method.icon}
                        <div className="flex-1">
                          <div className="font-medium">{method.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {method.description}
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Input Field */}
            <div className="space-y-2">
              <Label htmlFor="input">{selectedMethod.name}</Label>
              <Input
                id="input"
                placeholder={selectedMethod.placeholder}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError(null);
                }}
                disabled={isImporting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isImporting) {
                    handleImport();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Example: {selectedMethod.example}
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Import Info */}
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <div className="flex items-start gap-2 text-sm text-blue-700">
                <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">What gets imported?</p>
                  <ul className="text-xs text-blue-600 mt-1 space-y-1">
                    <li>• Artist information and images</li>
                    <li>• Upcoming shows and venues</li>
                    <li>• Complete song catalog (studio versions only)</li>
                    <li>• Real-time progress tracking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !inputValue.trim()}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Start Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
