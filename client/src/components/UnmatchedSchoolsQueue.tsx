import { useMemo, useState } from "react";
import type { SchoolRegistry as School } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SchoolNameAutocomplete } from "./SchoolNameAutocomplete";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface UnmatchedSchoolsQueueProps {
  unmatchedSchoolNames: string[];
  manualMatches: Record<string, School>;
  existingSchools: School[];
  onResolveMatch: (schoolName: string, selectedSchool: School | null) => void;
}

export function UnmatchedSchoolsQueue({
  unmatchedSchoolNames,
  manualMatches,
  existingSchools,
  onResolveMatch,
}: UnmatchedSchoolsQueueProps) {
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

  return (
    <Card className="border-amber-200 bg-amber-50 shadow-sm mt-4">
      <CardHeader className="pb-3 border-b border-amber-200/60 bg-amber-100/30">
        <CardTitle className="text-[14px] font-semibold text-amber-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Unmatched Schools Queue
          <Badge variant="secondary" className="bg-amber-200/60 text-amber-800 ml-2 shadow-none border-0">
            {unmatchedSchoolNames.length} Action Required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[350px]">
          <div className="divide-y divide-amber-100">
            {unmatchedSchoolNames.map((name) => (
              <UnmatchedSchoolRow
                key={name}
                name={name}
                currentMatch={manualMatches[name]}
                existingSchools={existingSchools}
                onResolveMatch={onResolveMatch}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function UnmatchedSchoolRow({
  name,
  currentMatch,
  existingSchools,
  onResolveMatch,
}: {
  name: string;
  currentMatch?: School;
  existingSchools: School[];
  onResolveMatch: (schoolName: string, selectedSchool: School | null) => void;
}) {
  const [inputValue, setInputValue] = useState(currentMatch?.schoolName || "");

  return (
    <div className="flex items-center justify-between p-4 hover:bg-amber-100/20 transition-colors">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-amber-950 truncate" title={name}>{name}</p>
        <p className="text-[11px] text-amber-700 mt-1">Unrecognized imported name</p>
      </div>
      <div className="w-[300px] flex-shrink-0">
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
      </div>
    </div>
  );
}
