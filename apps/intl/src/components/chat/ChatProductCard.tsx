'use client';

interface ChatProductCardProps {
  productId: string;
  name?: string;
  description?: string;
  price?: string;
  image?: string;
  onViewProduct?: (productId: string) => void;
}

export default function ChatProductCard({
  productId,
  name = 'Product',
  description = '',
  price = '',
  image = '',
  onViewProduct,
}: ChatProductCardProps) {
  return (
    <div className="mx-4 my-2 border border-gray-200 rounded-xl overflow-hidden bg-white">
      {image && (
        <div className="h-32 bg-gray-100 overflow-hidden">
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <h4 className="font-semibold text-gray-900 text-sm">{name}</h4>
        {description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>}
        {price && <p className="text-sm font-semibold text-blue-600 mt-2">{price}</p>}
        <button
          onClick={() => onViewProduct?.(productId)}
          className="mt-2 w-full py-2 text-xs font-medium text-blue-600 
                     bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
