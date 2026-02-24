import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { useCSVImport, CSVProduct, ImportResult } from "@/hooks/useCSVImport";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface CSVImportDialogProps {
  trigger?: React.ReactNode;
}

export const CSVImportDialog = ({ trigger }: CSVImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedData, setParsedData] = useState<CSVProduct[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { validateAndPreview, importProducts, isImporting, progress } = useCSVImport();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setImportResult(null);

    try {
      const result = await validateAndPreview(file);
      setParsedData(result);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse CSV file");
      setParsedData([]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [validateAndPreview]);

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    try {
      const result = await importProducts(parsedData);
      setImportResult(result);
      setParsedData([]);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Import failed");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setParsedData([]);
    setFileName("");
    setParseError("");
    setImportResult(null);
  };

  const downloadTemplate = () => {
    const template = `product_name,selling_price,cost_price,quantity,category_name,supplier_name
"Widget A",99.99,50.00,100,"Electronics","Tech Supplier"
"Widget B",149.99,75.00,50,"Clothing","Fashion Supplier"`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const existingCount = parsedData.filter(p => p.exists).length;
  const newCount = parsedData.filter(p => !p.exists).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import Products
          </DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: Product Name, Selling Price, Cost Price, Quantity, Category Name, Supplier Name.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Upload Section */}
          {!importResult && (
            <div className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  "hover:border-primary hover:bg-muted/50",
                  parseError && "border-destructive"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">
                  {fileName || "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  CSV files only (max 5MB)
                </p>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{parseError}</span>
                </div>
              )}

              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          )}

          {/* Preview Section */}
          {parsedData.length > 0 && !importResult && (
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {existingCount} to update
                  </Badge>
                  <Badge variant="default" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {newCount} new products
                  </Badge>
                  {parsedData.filter(p => p.newCategory).length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      {new Set(parsedData.filter(p => p.newCategory).map(p => p.category.toLowerCase())).size} new categories
                    </Badge>
                  )}
                  {parsedData.filter(p => p.newSupplier).length > 0 && (
                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                      <UserPlus className="h-3 w-3" />
                      {new Set(parsedData.filter(p => p.newSupplier).map(p => p.supplier.toLowerCase())).size} new suppliers
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 100).map((product, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {product.exists ? (
                            <Badge variant="secondary" className="text-xs">Update</Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <span className={cn(product.newCategory && "text-primary font-medium")}>
                            {product.category || "-"}
                            {product.newCategory && " (new)"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(product.newSupplier && "text-orange-600 font-medium")}>
                            {product.supplier || "-"}
                            {product.newSupplier && " (new)"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell className="text-right">{product.price}</TableCell>
                        <TableCell className="text-right">{product.cost_price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 100 && (
                  <p className="text-sm text-muted-foreground p-3 text-center">
                    Showing first 100 of {parsedData.length} products
                  </p>
                )}
              </ScrollArea>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing products...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {parsedData.length} Products
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Result Section */}
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <h4 className="font-semibold">Import Complete!</h4>
                  <p className="text-sm text-muted-foreground">
                    {importResult.created} products created, {importResult.updated} updated
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-card border rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                  <p className="text-sm text-muted-foreground">Created</p>
                </div>
                <div className="p-4 bg-card border rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                  <p className="text-sm text-muted-foreground">Updated</p>
                </div>
                <div className="p-4 bg-card border rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{importResult.categoriesCreated}</p>
                  <p className="text-sm text-muted-foreground">Categories</p>
                </div>
                <div className="p-4 bg-card border rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{importResult.suppliersCreated}</p>
                  <p className="text-sm text-muted-foreground">Suppliers</p>
                </div>
              </div>

              {/* New Supplier Notification */}
              {importResult.newSupplierNames.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <UserPlus className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-800 dark:text-orange-300">
                      New Suppliers Added
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                      The following suppliers were created with name only. Please update their details (email, phone, address) in the Suppliers section:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {importResult.newSupplierNames.map((name, idx) => (
                        <li key={idx} className="text-sm font-medium text-orange-800 dark:text-orange-300">
                          • {name}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
                      onClick={() => {
                        handleClose();
                        navigate("/suppliers");
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Go to Suppliers
                    </Button>
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <h4 className="font-semibold text-destructive mb-2">
                    {importResult.errors.length} Errors
                  </h4>
                  <ScrollArea className="h-32">
                    <ul className="text-sm space-y-1">
                      {importResult.errors.map((error, idx) => (
                        <li key={idx} className="text-destructive">• {error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={() => {
                  setImportResult(null);
                  setParsedData([]);
                  setFileName("");
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Import More
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
