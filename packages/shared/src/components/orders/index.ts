/**
 * VetSphere Order Components Library
 * Professional order UI components for international e-commerce
 *
 * Components:
 * - OrderStatusBadge: Status badge with icons and colors
 * - OrderTimeline: Progress timeline for order tracking
 * - OrderFilters: Status filter bar with pill buttons
 * - OrderCard: Order card for list display
 * - OrdersList: Full order list with filtering and pagination
 * - RecentOrdersWidget: Quick widget for user center
 */

export { OrderStatusBadge, ORDER_STATUS_CONFIG, getOrderStatusConfig } from './OrderStatusBadge';
export type { OrderStatusBadgeProps } from './OrderStatusBadge';

export { OrderTimeline, generateTimelineSteps } from './OrderTimeline';
export type { OrderTimelineProps, TimelineStep } from './OrderTimeline';

export { OrderFilters, getDefaultFilterOptions } from './OrderFilters';
export type { OrderFiltersProps, FilterOption } from './OrderFilters';

export { OrderCard } from './OrderCard';
export type { OrderCardProps, OrderCardData, OrderItemPreview } from './OrderCard';

export { OrdersList } from './OrdersList';
export type { OrdersListProps, PaginationInfo } from './OrdersList';

export { RecentOrdersWidget } from './RecentOrdersWidget';
export type { RecentOrdersWidgetProps, RecentOrder } from './RecentOrdersWidget';