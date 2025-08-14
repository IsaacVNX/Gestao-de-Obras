
'use client';
import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const INITIAL_VISIBLE_ITEMS = 20;

interface SearchableSelectProps<T> {
  items: T[];
  onSelectItem: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  filterFunction: (item: T, query: string) => boolean;
  placeholder?: string;
  displayValue: string;
  setDisplayValue?: (value: string) => void;
  disabled?: boolean;
  selectedItemId?: string | null;
}

export function SearchableSelect<T extends { id: string }>({
  items,
  onSelectItem,
  renderItem,
  filterFunction,
  placeholder = 'Selecione um item...',
  displayValue,
  setDisplayValue,
  disabled = false,
  selectedItemId,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [visibleItemsCount, setVisibleItemsCount] = React.useState(INITIAL_VISIBLE_ITEMS);

  const filteredItems = React.useMemo(() => {
    if (!query) return items;
    return items.filter((item) => filterFunction(item, query));
  }, [items, query, filterFunction]);

  const itemsToShow = React.useMemo(() => {
    return filteredItems.slice(0, visibleItemsCount);
  }, [filteredItems, visibleItemsCount]);

  const handleSelect = (item: T) => {
    onSelectItem(item);
    setOpen(false);
  };

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setVisibleItemsCount(INITIAL_VISIBLE_ITEMS);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-black bg-background border-border"
          disabled={disabled}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command filter={() => 1}>
          <CommandInput 
            placeholder="Pesquisar..." 
            value={query} 
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {itemsToShow.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleSelect(item)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedItemId === item.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {renderItem(item)}
                </CommandItem>
              ))}
              {filteredItems.length > visibleItemsCount && (
                <CommandItem
                  onSelect={() => {
                    setVisibleItemsCount(prev => prev + INITIAL_VISIBLE_ITEMS);
                  }}
                  className="justify-center text-center text-sm text-muted-foreground cursor-pointer"
                >
                  Exibir mais {Math.min(INITIAL_VISIBLE_ITEMS, filteredItems.length - visibleItemsCount)}...
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
