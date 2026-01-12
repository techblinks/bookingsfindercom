interface DestinationCardProps {
  city: string;
  country: string;
  image: string;
  price: number;
  currency?: string;
}

const DestinationCard = ({
  city,
  country,
  image,
  price,
  currency = "$",
}: DestinationCardProps) => {
  return (
    <a
      href="#"
      className="group block travel-card overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={`${city}, ${country}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Price Badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-card/90 backdrop-blur-sm text-foreground">
            From {currency}{price}
          </span>
        </div>

        {/* City Info - Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white mb-0.5">{city}</h3>
          <p className="text-sm text-white/80">{country}</p>
        </div>
      </div>
    </a>
  );
};

export default DestinationCard;
