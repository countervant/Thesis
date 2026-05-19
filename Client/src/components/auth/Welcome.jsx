import React from "react";
import backgroundImage from "../../assets/backround.png";

const Welcome = ({ order, order1, text, className = "", mobileAuthHero = false }) => {
  return (
    <>
      <div
        className={`relative order-${order} md:order-${order1} ${
          mobileAuthHero ? "block min-h-[430px]" : "hidden"
        } md:block w-full md:w-1/2 sm:min-h-[40vh] md:min-h-screen bg-cover bg-center text-white ${className}`}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-[rgba(224,58,175,0.7)]" />
        <div
          className={`relative z-10 flex h-full flex-col px-6 sm:px-10 md:px-12 ${
            mobileAuthHero
              ? "justify-start space-y-4 pt-20 pb-24 md:justify-center md:space-y-8 md:py-0"
              : "justify-center space-y-6 py-10 sm:space-y-8 md:py-0"
          }`}
        >
          <div>
            <p className={`${mobileAuthHero ? "text-lg md:text-2xl" : "text-xl"} sm:text-2xl font-medium mb-2`}>{text}</p>
            <h1 className={`${mobileAuthHero ? "text-3xl leading-tight md:text-4xl md:leading-tight lg:text-5xl" : "text-3xl"} sm:text-4xl lg:text-5xl font-bold`}>
              Dream Light Visual
            </h1>
          </div>
          <div className={`${mobileAuthHero ? "max-w-[300px] space-y-4 md:max-w-none md:space-y-6" : "space-y-6"}`}>
            <div>
              <h2 className={`${mobileAuthHero ? "text-lg md:text-xl" : "text-lg"} sm:text-xl font-bold mb-2`}>Mission</h2>
              <p className={`${mobileAuthHero ? "text-sm leading-6 md:text-base md:leading-relaxed" : "text-sm"} sm:text-base leading-relaxed`}>
                To provide the best results of high-quality and most
                cost-effective videos, graphics and website services designed.
                To fulfill the needs of our clients and gratify their experience
                in terms of performance and outcome.
              </p>
            </div>
            <div>
              <h2 className={`${mobileAuthHero ? "text-lg md:text-xl" : "text-lg"} sm:text-xl font-bold mb-2`}>Vision</h2>
              <p className={`${mobileAuthHero ? "text-sm leading-6 md:text-base md:leading-relaxed" : "text-sm"} sm:text-base leading-relaxed`}>
                To be the most reliable and trustworthy marketing agency
                designed to accomplish the needs of small, medium, and large
                businesses worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Welcome;
