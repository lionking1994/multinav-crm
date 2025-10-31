import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  startOpen?: boolean;
  titleClassName?: string;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, startOpen = false, titleClassName }) => {
  const [isOpen, setIsOpen] = useState(startOpen);
  const uniqueId = title.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4 bg-white/80 dark:bg-gray-800/80 shadow-sm transition-all duration-300">
      <h2 id={`accordion-header-${uniqueId}`}>
        <button
          type="button"
          className="flex justify-between items-center w-full p-4 font-medium text-left text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-lime-green-300"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={`accordion-body-${uniqueId}`}
        >
          <span className={`text-md font-semibold ${titleClassName || ''}`}>{title}</span>
          <ChevronDown className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div
        id={`accordion-body-${uniqueId}`}
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1500px]' : 'max-h-0'}`}
        aria-labelledby={`accordion-header-${uniqueId}`}
      >
        <div className="p-4 border-t border-gray-200 dark:border-gray-600">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Accordion;