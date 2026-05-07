import React from "react";
import backgroundImage from "../../assets/backround.png";

const Welcome = ({ order, order1, text }) => {
  return (
    <>
      <div
        className={`relative order-${order} md:order-${order1} hidden md:block w-full md:w-1/2 sm:min-h-[40vh] md:min-h-screen bg-cover bg-center text-white`}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-[rgba(224,58,175,0.7)]" />
        <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-10 md:px-12 py-10 md:py-0 space-y-6 sm:space-y-8">
          <div>
            <p className="text-xl sm:text-2xl font-medium mb-2">{text}</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Dream Light Visual
            </h1>
          </div>
          <div className="space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">Mission</h2>
              <p className="text-sm sm:text-base leading-relaxed">
                To provide the best results of high-quality and most
                cost-effective videos, graphics and website services designed.
                To fulfill the needs of our clients and gratify their experience
                in terms of performance and outcome.
              </p>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">Vision</h2>
              <p className="text-sm sm:text-base leading-relaxed">
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
