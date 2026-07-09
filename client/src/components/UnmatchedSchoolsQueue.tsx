import { useMemo, useState } from "react";
import type { SchoolRegistry as School } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SchoolNameAutocomplete } from "./SchoolNameAutocomplete";
import { CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Download, Plus, MapPin } from "lucide-react";
import { AddSchoolMapModal } from "./AddSchoolMapModal";
import { Checkbox } from "@/components/ui/checkbox";
import { BatchGeocodeReviewModal } from "./BatchGeocodeReviewModal";

interface UnmatchedSchoolsQueueProps {
  unmatchedSchoolNames: string[];
  unmatchedSchoolsData?: { name: string, municipality: string }[];
  manualMatches: Record<string, School>;
  existingSchools: School[];
  onResolveMatch: (schoolName: string, selectedSchool: School | null) => void;
}

export function UnmatchedSchoolsQueue({
  unmatchedSchoolNames,
  unmatchedSchoolsData,
  manualMatches,
  existingSchools,
  onResolveMatch,
}: UnmatchedSchoolsQueueProps) {
  const [page, setPage] = useState(1);
  const [modalSchoolName, setModalSchoolName] = useState<string | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  
  const itemsPerPage = 50;
  
  const totalPages = Math.max(1, Math.ceil(unmatchedSchoolNames.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);

  const currentItems = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return unmatchedSchoolNames.slice(start, start + itemsPerPage);
  }, [unmatchedSchoolNames, safePage]);

  if (unmatchedSchoolNames.length === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-3" />
          <p className="text-emerald-800 font-medium">All schools matched!</p>
          <p className="text-emerald-600 text-sm mt-1">There are no unmatched schools in the current batch.</p>
        </CardContent>
      </Card>
    );
  }

  const handleExportCSV = () => {
    const headers = ["School Name", "Latitude", "Longitude", "Address", "Notes"];
    
    const escapeCsv = (str: string) => {
      const s = String(str || "").replace(/"/g, '""');
      return `"${s}"`;
    };

    const schoolsData = unmatchedSchoolsData || unmatchedSchoolNames.map(name => ({ name, municipality: "" }));

    const rows = schoolsData.map(school => [
      escapeCsv(school.name),
      "", // Latitude
      "", // Longitude
      escapeCsv(school.municipality), // Address
      ""  // Notes
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "Unmatched_Schools_Geocoding.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSchools(new Set(unmatchedSchoolNames));
    } else {
      setSelectedSchools(new Set());
    }
  };

  const handleSelectRow = (name: string, checked: boolean) => {
    setSelectedSchools(prev => {
      const next = new Set(prev);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const isAllSelected = unmatchedSchoolNames.length > 0 && selectedSchools.size === unmatchedSchoolNames.length;
  const isSomeSelected = selectedSchools.size > 0 && selectedSchools.size < unmatchedSchoolNames.length;

  const schoolsToProcess = Array.from(selectedSchools).map(name => {
    const schoolData = unmatchedSchoolsData?.find(d => d.name === name);
    return { name, address: schoolData?.municipality || "" };
  });

  return (
    <Card className="border-amber-200 bg-amber-50 shadow-sm flex-1 flex flex-col min-h-0">
      <CardHeader className="pb-3 border-b border-amber-200/60 bg-amber-100/30 shrink-0 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox 
            checked={isAllSelected || (isSomeSelected ? "indeterminate" : false)} 
            onCheckedChange={handleSelectAll} 
            className="border-amber-500 data-[state=checked]:bg-amber-600 data-[state=checked]:text-white"
          />
          <CardTitle className="text-[14px] font-semibold text-amber-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Unmatched Schools Queue
            <Badge variant="secondary" className="bg-amber-200/60 text-amber-800 ml-2 shadow-none border-0">
              {unmatchedSchoolNames.length} Action Required
            </Badge>
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            disabled={selectedSchools.size === 0}
            className="h-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-600/50 disabled:text-white/70"
            onClick={() => setShowBatchModal(true)}
          >
            <MapPin className="h-3.5 w-3.5" />
            Auto-Geocode Selected {selectedSchools.size > 0 ? `(${selectedSchools.size})` : ''}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5" />
            Export to CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 min-h-[250px]">
          <div className="divide-y divide-amber-100">
            {currentItems.map((name) => {
              const schoolData = unmatchedSchoolsData?.find(d => d.name === name);
              const address = schoolData?.municipality;
              return (
                <UnmatchedSchoolRow
                  key={name}
                  name={name}
                  address={address}
                  currentMatch={manualMatches[name]}
                  existingSchools={existingSchools}
                  onResolveMatch={onResolveMatch}
                  onAddNew={() => setModalSchoolName(name)}
                  selected={selectedSchools.has(name)}
                  onSelect={(checked) => handleSelectRow(name, checked)}
                />
              );
            })}
          </div>
        </ScrollArea>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-amber-200/60 bg-amber-50 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="h-8 text-xs bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-xs font-medium text-amber-900">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="h-8 text-xs bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
      {modalSchoolName !== null && (
        <AddSchoolMapModal
          open={true}
          onOpenChange={(open) => {
            if (!open) setModalSchoolName(null);
          }}
          defaultSchoolName={modalSchoolName}
          studentAddress={unmatchedSchoolsData?.find(d => d.name === modalSchoolName)?.municipality}
          onSuccess={(school) => {
            onResolveMatch(modalSchoolName, school);
            setModalSchoolName(null);
          }}
        />
      )}
      <BatchGeocodeReviewModal 
        open={showBatchModal}
        onOpenChange={setShowBatchModal}
        schoolsToProcess={schoolsToProcess}
        onComplete={() => {
          setSelectedSchools(new Set());
        }}
        onResolveMatch={onResolveMatch}
      />
    </Card>
  );
}

function UnmatchedSchoolRow({
  name,
  address,
  currentMatch,
  existingSchools,
  onResolveMatch,
  onAddNew,
  selected,
  onSelect
}: {
  name: string;
  address?: string;
  currentMatch?: School;
  existingSchools: School[];
  onResolveMatch: (schoolName: string, selectedSchool: School | null) => void;
  onAddNew: () => void;
  selected: boolean;
  onSelect: (checked: boolean) => void;
}) {
  const [inputValue, setInputValue] = useState(currentMatch?.schoolName || "");

  return (
    <div className={`flex items-center justify-between p-4 hover:bg-amber-100/20 transition-colors ${selected ? 'bg-amber-100/30' : ''}`}>
      <div className="flex items-center flex-1 min-w-0 pr-6 gap-3">
        <Checkbox 
          checked={selected} 
          onCheckedChange={(checked) => onSelect(checked === true)}
          className="border-amber-400 mt-1"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-950 truncate" title={name}>{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
              Unrecognized name
            </Badge>
            {address && (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Student Address: {address}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="w-[300px] flex-shrink-0 flex items-center">
        <SchoolNameAutocomplete
          value={inputValue}
          onValueChange={setInputValue}
          existingSchools={existingSchools}
          onSelect={(selection) => {
            if (selection.type === "registry") {
              onResolveMatch(name, selection.school);
              setInputValue(selection.school.schoolName);
            }
          }}
          placeholder="Search existing school registry..."
          inputClassName="h-8 text-sm"
        />
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 ml-2 flex-shrink-0" 
          onClick={onAddNew}
          title="Add New School"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
