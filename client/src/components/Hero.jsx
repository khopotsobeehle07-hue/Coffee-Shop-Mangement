
export default function Hero() {
    return (
        <section className="hero" id="home">
            <div className="hero-content">
                <span className="eyebrow">YOUR DAILY COFFEE RITUAL</span>

                <h1>
                    Life begins after
                    <span> coffee.</span>
                </h1>

                <p>
                    Freshly brewed coffee, delicious pastries
                    and moments worth slowing down for.
                </p>

                <a href="#menu" className="primary-button">
                    Explore Our Menu
                </a>
            </div>

            <div className="hero-image">
                <img
                    src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200"
                    alt="Freshly brewed coffee"
                />
            </div>
        </section>
    );
}
