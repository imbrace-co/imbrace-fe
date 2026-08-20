import { useCallback } from "react";

import { FlexibleTableRef } from "@/components/FlexibleTable/types";

import { useState } from "react";

export const useFilter = (tableRef: React.RefObject<FlexibleTableRef<API.BoardItem>>) => {
    const [isFilterVisible, setIsFilterVisible] = useState<boolean>(false);
    const [filterCount, setFilterCount] = useState(0);
  
    const onFilterChange = useCallback(() => {
      setIsFilterVisible((prev) => !prev);
    }, []);
  
    const resetFilters = useCallback(() => {
      tableRef.current?.resetFilterState();
      setFilterCount(0);
      setIsFilterVisible(false);
    }, []);
  
    return {
      isFilterVisible,
      setIsFilterVisible,
      filterCount,
      setFilterCount,
      onFilterChange,
      resetFilters
    };
  };
  