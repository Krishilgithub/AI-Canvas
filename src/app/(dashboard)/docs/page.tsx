"use client";

import { useState } from "react";
import { DOCS_CATEGORIES, FAQS } from "@/components/docs/docs-data";
import { FAQAccordion } from "@/components/docs/faq-accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Book,
  Lightbulb,
  HelpCircle,
  ChevronRight,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DocsPage() {
  const [activeCategory, setActiveCategory] = useState(DOCS_CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter content based on search
  const filteredCategories = searchQuery
    ? DOCS_CATEGORIES.map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (art) =>
            art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            art.content.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      })).filter((cat) => cat.articles.length > 0)
    : DOCS_CATEGORIES;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="bg-card rounded-xl p-8 border border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
            <Book className="h-8 w-8 text-primary" />
            Documentation Center
          </h1>
          <p className="text-muted-foreground text-lg">
            Master AI Canvas with our guides, tutorials, and FAQs.
          </p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guides..."
            className="pl-9 bg-background/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation (Desktop) */}
        <div className="hidden lg:block lg:col-span-3 sticky top-4 space-y-2">
          <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4 px-2">
            Categories
          </div>
          {DOCS_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id);
                scrollToSection(category.id);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between group",
                activeCategory === category.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {category.title}
              {activeCategory === category.id && (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-border/50">
            <button
              onClick={() => scrollToSection("faqs")}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center gap-2"
            >
              <HelpCircle className="h-4 w-4" /> FAQs
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-12 pb-20">
          {filteredCategories.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          )}

          {filteredCategories.map((category) => (
            <section
              key={category.id}
              id={category.id}
              className="scroll-mt-24 space-y-6"
            >
              <div className="flex items-center gap-2 border-b pb-2 mb-6">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <h2 className="text-2xl font-bold">{category.title}</h2>
              </div>

              <div className="grid gap-6">
                {category.articles.map((article) => (
                  <div
                    key={article.id}
                    className="p-6 rounded-xl border bg-card/50 hover:bg-card transition-colors"
                  >
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary/60" />
                      {article.title}
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {article.content}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* FAQ Section */}
          <section id="faqs" className="scroll-mt-24 pt-8 border-t">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="h-6 w-6 text-blue-500" />
              <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <FAQAccordion items={FAQS} />
            </div>
          </section>

          {/* Support Banner */}
          <div className="mt-12 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-xl p-8 text-center border border-primary/20">
            <h3 className="text-lg font-semibold mb-2">Still need help?</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Our support team is available 24/7 to help you with any issues or
              questions.
            </p>
            <Button>Contact Support</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
