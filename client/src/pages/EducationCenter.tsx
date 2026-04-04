import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
  TrendingUp,
  Shield,
  Heart,
  DollarSign,
  FileText,
  Play,
  BookOpen,
  HelpCircle,
  Wrench,
  ExternalLink,
  CheckSquare,
  ArrowRight,
  Calculator,
  Phone,
  GraduationCap,
  Tag,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { education } from '../services/api';
import type { EducationResource, EducationCategory, EducationResourceType } from '../types';

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

interface CategoryDef {
  key: EducationCategory | 'all';
  label: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: 'All', icon: <GraduationCap className="h-4 w-4" /> },
  { key: 'retirement_systems', label: 'Retirement Systems', icon: <Building2 className="h-4 w-4" /> },
  { key: 'tsp', label: 'TSP', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'ssa', label: 'Social Security', icon: <Shield className="h-4 w-4" /> },
  { key: 'fegli', label: 'FEGLI', icon: <Heart className="h-4 w-4" /> },
  { key: 'financial_planning', label: 'Financial Planning', icon: <DollarSign className="h-4 w-4" /> },
  { key: 'forms_guides', label: 'Forms & Guides', icon: <FileText className="h-4 w-4" /> },
];

interface TypeDef {
  key: EducationResourceType | 'all';
  label: string;
}

const TYPES: TypeDef[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Videos' },
  { key: 'document', label: 'Documents' },
  { key: 'article', label: 'Articles' },
  { key: 'faq', label: 'FAQs' },
  { key: 'tool', label: 'Tools' },
];

const TYPE_ICON: Record<EducationResourceType, React.ReactNode> = {
  video: <Play className="h-5 w-5" />,
  document: <FileText className="h-5 w-5" />,
  article: <BookOpen className="h-5 w-5" />,
  faq: <HelpCircle className="h-5 w-5" />,
  tool: <Wrench className="h-5 w-5" />,
};

const TYPE_COLOR: Record<EducationResourceType, string> = {
  video: 'bg-red-100 text-red-700',
  document: 'bg-blue-100 text-blue-700',
  article: 'bg-emerald-100 text-emerald-700',
  faq: 'bg-amber-100 text-amber-700',
  tool: 'bg-purple-100 text-purple-700',
};

const CATEGORY_BADGE: Record<EducationCategory, string> = {
  retirement_systems: 'badge-primary',
  tsp: 'badge-accent',
  ssa: 'badge-success',
  fegli: 'badge-warning',
  financial_planning: 'badge-neutral',
  forms_guides: 'badge-primary',
};

const CATEGORY_LABEL: Record<EducationCategory, string> = {
  retirement_systems: 'Retirement Systems',
  tsp: 'TSP',
  ssa: 'Social Security',
  fegli: 'FEGLI',
  financial_planning: 'Financial Planning',
  forms_guides: 'Forms & Guides',
};

function getActionLabel(type: EducationResourceType): string {
  switch (type) {
    case 'video': return 'Watch';
    case 'document': return 'Download';
    case 'tool': return 'Try Tool';
    default: return 'Learn More';
  }
}

function getActionIcon(type: EducationResourceType): React.ReactNode {
  switch (type) {
    case 'video': return <Play className="h-4 w-4" />;
    case 'document': return <FileText className="h-4 w-4" />;
    case 'tool': return <Wrench className="h-4 w-4" />;
    default: return <ArrowRight className="h-4 w-4" />;
  }
}

// ---------------------------------------------------------------------------
//  Skeleton
// ---------------------------------------------------------------------------

function ResourceCardSkeleton() {
  return (
    <div className="card">
      <div className="card-body space-y-3">
        <div className="skeleton h-10 w-10 rounded-lg" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-20 rounded-full" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="flex gap-1 mt-2">
          <div className="skeleton h-5 w-14 rounded-full" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
        <div className="skeleton h-9 w-full rounded-md mt-2" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Main Component
// ---------------------------------------------------------------------------

export default function EducationCenter() {
  // Data state
  const [resources, setResources] = useState<EducationResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<EducationCategory | 'all'>('all');
  const [activeType, setActiveType] = useState<EducationResourceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal
  const [selectedResource, setSelectedResource] = useState<EducationResource | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // -------------------------------------------------------------------------
  //  Data fetching
  // -------------------------------------------------------------------------

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (activeType !== 'all') params.type = activeType;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const result = await education.list(params);
      setResources(Array.isArray(result) ? result : []);
    } catch {
      setError('Failed to load education resources. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeType, searchQuery]);

  useEffect(() => {
    const timeout = setTimeout(fetchResources, searchQuery ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [fetchResources, searchQuery]);

  // -------------------------------------------------------------------------
  //  Detail
  // -------------------------------------------------------------------------

  async function openDetail(resource: EducationResource) {
    setLoadingDetail(true);
    setSelectedResource(resource);
    try {
      const full = await education.getById(resource.id);
      setSelectedResource(full);
    } catch {
      // Keep the card-level data
    } finally {
      setLoadingDetail(false);
    }
  }

  // -------------------------------------------------------------------------
  //  Sorted resources
  // -------------------------------------------------------------------------

  const sortedResources = useMemo(
    () => [...resources].sort((a, b) => a.order - b.order),
    [resources],
  );

  // -------------------------------------------------------------------------
  //  Error state
  // -------------------------------------------------------------------------

  if (error && !loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Education & Resources</h1>
            <p className="page-subtitle">Learn about your federal retirement benefits</p>
          </div>
        </div>
        <div className="alert-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error loading resources</p>
            <p className="mt-1">{error}</p>
          </div>
          <button onClick={fetchResources} className="btn-secondary btn-sm ml-auto">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  //  Render
  // -------------------------------------------------------------------------

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Education & Resources</h1>
          <p className="page-subtitle">Learn about your federal retirement benefits</p>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/*  Quick Links                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLinkCard
            icon={<CheckSquare className="h-5 w-5 text-primary-700" />}
            title="Retirement Readiness Checklist"
            description="Review the essential steps before retirement"
            color="bg-primary-50 border-primary-200"
            onClick={() => {
              setActiveCategory('forms_guides');
              setSearchQuery('readiness checklist');
            }}
          />
          <QuickLinkCard
            icon={<Building2 className="h-5 w-5 text-accent-700" />}
            title="Compare CSRS vs FERS"
            description="Understand the key differences"
            color="bg-accent-50 border-accent-200"
            onClick={() => {
              setActiveCategory('retirement_systems');
              setSearchQuery('CSRS FERS');
            }}
          />
          <Link to="/calculator" className="no-underline">
            <QuickLinkCard
              icon={<Calculator className="h-5 w-5 text-emerald-700" />}
              title="TSP Contribution Calculator"
              description="Optimize your TSP contributions"
              color="bg-emerald-50 border-emerald-200"
            />
          </Link>
          <a
            href="https://www.opm.gov/retirement-center/"
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline"
          >
            <QuickLinkCard
              icon={<Phone className="h-5 w-5 text-blue-700" />}
              title="Contact HR / OPM"
              description="Get help from a benefits specialist"
              color="bg-blue-50 border-blue-200"
              external
            />
          </a>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Category Tabs                                                     */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Type Pills & Search                                               */}
      {/* ----------------------------------------------------------------- */}
      <section className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeType === t.key
                  ? 'bg-accent-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            className="form-input pl-9 text-sm"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-neutral-400 hover:text-neutral-600" />
            </button>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/*  Resource Grid                                                     */}
      {/* ----------------------------------------------------------------- */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedResources.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-16">
            <GraduationCap className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium">No resources found</p>
            <p className="text-neutral-400 text-sm mt-1">
              Try adjusting your filters or search terms.
            </p>
            {(activeCategory !== 'all' || activeType !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setActiveType('all');
                  setSearchQuery('');
                }}
                className="btn-secondary mt-4"
              >
                <RefreshCw className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedResources.map((resource) => (
            <div
              key={resource.id}
              className="card hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => openDetail(resource)}
            >
              <div className="card-body">
                {/* Type Icon */}
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg mb-3 ${TYPE_COLOR[resource.type]}`}>
                  {TYPE_ICON[resource.type]}
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-neutral-800 group-hover:text-primary-700 transition-colors mb-1">
                  {resource.title}
                </h3>

                {/* Category Badge */}
                <div className="mb-2">
                  <span className={`${CATEGORY_BADGE[resource.category]} text-xs`}>
                    {CATEGORY_LABEL[resource.category]}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-neutral-500 line-clamp-3 mb-3">
                  {resource.description}
                </p>

                {/* Tags */}
                {resource.tags && resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {resource.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded-full"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                    {resource.tags.length > 4 && (
                      <span className="text-[10px] text-neutral-400 px-1">
                        +{resource.tags.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetail(resource);
                  }}
                  className="btn-primary w-full text-sm mt-auto"
                >
                  {getActionIcon(resource.type)}
                  {getActionLabel(resource.type)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/*  Resource Detail Modal                                             */}
      {/* ----------------------------------------------------------------- */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedResource(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-neutral-200">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${TYPE_COLOR[selectedResource.type]}`}>
                    {TYPE_ICON[selectedResource.type]}
                  </div>
                  <div className="flex gap-2">
                    <span className={`${CATEGORY_BADGE[selectedResource.category]} text-xs`}>
                      {CATEGORY_LABEL[selectedResource.category]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR[selectedResource.type]}`}>
                      {selectedResource.type.charAt(0).toUpperCase() + selectedResource.type.slice(1)}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-primary-800">
                  {selectedResource.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedResource(null)}
                className="btn-ghost btn-sm p-1 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {loadingDetail && (
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading full content...
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                  Description
                </h4>
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {selectedResource.description}
                </p>
              </div>

              {/* Content */}
              {selectedResource.content && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    Content
                  </h4>
                  <div className="prose prose-sm max-w-none text-neutral-700 bg-neutral-50 rounded-lg p-4 border border-neutral-100">
                    {selectedResource.content.split('\n').map((paragraph, i) => (
                      <p key={i} className={i > 0 ? 'mt-2' : ''}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* URL */}
              {selectedResource.url && (
                <div>
                  <a
                    href={selectedResource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-accent inline-flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {getActionLabel(selectedResource.type)}
                  </a>
                </div>
              )}

              {/* Tags */}
              {selectedResource.tags && selectedResource.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedResource.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Updated */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 pt-2 border-t border-neutral-100">
                <Clock className="h-3.5 w-3.5" />
                Last updated {format(new Date(selectedResource.updatedAt), 'MMMM d, yyyy')}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
              <button
                onClick={() => setSelectedResource(null)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Quick Link Card sub-component
// ---------------------------------------------------------------------------

interface QuickLinkCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  external?: boolean;
  onClick?: () => void;
}

function QuickLinkCard({ icon, title, description, color, external, onClick }: QuickLinkCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${color}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-neutral-800 truncate">{title}</h3>
            {external && <ExternalLink className="h-3 w-3 text-neutral-400 flex-shrink-0" />}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}
