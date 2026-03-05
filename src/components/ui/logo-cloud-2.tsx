import { PlusIcon } from "lucide-react";
import { cn } from "../../lib/utils";

type Logo = {
    src?: string;
    alt: string;
    width?: number;
    height?: number;
    invert?: boolean;
};

type LogoCloudProps = React.ComponentProps<"div">;

export function LogoCloud({ className, ...props }: LogoCloudProps) {
    return (
        <div
            className={cn(
                "relative grid grid-cols-2 md:grid-cols-4",
                className
            )}
            {...props}
        >
            {/* Top full-width border line */}


            {/* 1. The Oodie */}
            <LogoCard
                className="relative border-r border-b border-black/10"
                logo={{ src: "/brand-logos/the-oodie.webp", alt: "The Oodie" }}
            >
                <PlusIcon className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6 text-black" strokeWidth={1} />
            </LogoCard>

            {/* 2. Twosge */}
            <LogoCard
                className="border-b border-black/10 md:border-r md:border-black/10"
                logo={{ src: "/brand-logos/twosvge.webp", alt: "Twosge", invert: true }}
            />

            {/* 3. OTAA */}
            <LogoCard
                className="relative border-r border-b border-black/10"
                logo={{ src: "/brand-logos/otaa.png", alt: "OTAA" }}
            >
                <PlusIcon className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6 text-black" strokeWidth={1} />
                <PlusIcon className="-bottom-[12.5px] -left-[12.5px] absolute z-10 hidden size-6 md:block text-black" strokeWidth={1} />
            </LogoCard>

            {/* 4. Bogey Bros */}
            <LogoCard
                className="border-b border-black/10"
                logo={{ src: "/brand-logos/bogey-bros.webp", alt: "Bogey Bros" }}
            />

            {/* 5. Daily Mentor */}
            <LogoCard
                className="relative border-r border-black/10"
                logo={{ src: "/brand-logos/daily-mentor.avif", alt: "Daily Mentor" }}
            />

            {/* 6. Candy Claws */}
            <LogoCard
                className="border-black/10 md:border-r"
                logo={{ alt: "Candy Claws" }}
            />

            {/* 7. Canvas Cultures */}
            <LogoCard
                className="border-r border-black/10"
                logo={{ alt: "Canvas Cultures" }}
            />

            {/* 8. VOID */}
            <LogoCard
                className="border-black/10"
                logo={{ src: "/brand-logos/void.webp", alt: "VOID", invert: true }}
            />

            {/* Bottom full-width border line */}
            <div className="-translate-x-1/2 -bottom-px pointer-events-none absolute left-1/2 w-screen border-b border-black/10" />
        </div>
    );
}

type LogoCardProps = React.ComponentProps<"div"> & {
    logo: Logo;
};

function LogoCard({ logo, className, children, ...props }: LogoCardProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-center bg-white px-6 py-10 md:px-8 md:py-10",
                className
            )}
            {...props}
        >
            {logo.src ? (
                <img
                    alt={logo.alt}
                    className={cn(
                        "pointer-events-none h-16 w-auto max-w-[140px] select-none object-contain",
                        logo.invert && "invert"
                    )}
                    height={logo.height || 48}
                    src={logo.src}
                    width={logo.width || "auto"}
                />
            ) : (
                <span className="font-black text-gray-700 text-lg sm:text-xl tracking-tight text-center uppercase">
                    {logo.alt}
                </span>
            )}
            {children}
        </div>
    );
}
