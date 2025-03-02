"use client";
import Link from "next/link";
import React, { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import { TextEffect } from "@/components/ui/text-effect";

function HeroSection() {
  const imageRef = useRef(null);
  useEffect(() => {
    const imageElement = imageRef.current;
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshhold = 100;

      if (scrollPosition > scrollThreshhold) {
        imageElement.classList.add("scrolled");
      } else {
        imageElement.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.addEventListener("scroll", handleScroll);
  });
  return (
    <section className="w-full pt-36 md:pt-48 pb-10">
      <div className="space-y-6 text-center">
        <div className="space-y-6 mx-auto">
          <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl xl:text-7xl gradient-title">
            Aim<span className="text-[#f49137]">A</span>head - Your AI Partner
            for <br /> Career Breakthroughs
          </h1>

          <TextEffect per='char' preset='fade' className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
            Boost your career with expert guidance, AI-driven interview prep,
            and smart tools for job success.
          </TextEffect>
        </div>

        <div>
          <Link href="/onboarding">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
        </div>
        <div className="hero-image-wrapper mt-5 md:mt-0  overflow-hidden">
          <div ref={imageRef} className="hero-image">
            <Image
              src={"/AimAheadBannerHD.jpg"}
              width={1100}
              height={720}
              alt="Banner Preview"
              className="rounded-lg shadow-2xl mx-auto"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
