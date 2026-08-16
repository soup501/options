"use client";
import { useState } from "react";
import { AppShell, SectionHeader } from "@/components/app-shell";
import { CallLesson } from "@/components/call-lesson";
import { LearnChat } from "@/components/learn-chat";

const lessons = [
  [
    "Calls & puts",
    "A call gives the buyer the right to buy shares. A put gives the buyer the right to sell shares. Buyers pay a premium for that choice; sellers receive the premium and take on an obligation.",
    "Start with the right, then identify who has the obligation.",
  ],
  [
    "Premium & break-even",
    "Premium is the price of the contract, quoted per share. One standard contract usually controls 100 shares, so a $4.00 quote costs $400 before fees. Break-even includes the premium paid.",
    "Premium paid = maximum loss for a long option.",
  ],
  [
    "Opening & closing",
    "Buy to open creates a long position. Sell to close exits it. Sell to open creates a short obligation, while buy to close exits that obligation. The action and position effect should always be explicit.",
    "Never assume that selling means closing.",
  ],
  [
    "Covered calls",
    "A covered call pairs a short call with shares you already own. You receive premium, but if the stock finishes above the strike at settlement, your reserved shares may be delivered at that strike.",
    "Income comes with a capped upside and an assignment obligation.",
  ],
  [
    "Cash-secured puts",
    "A cash-secured put reserves enough cash to buy 100 shares per contract at the strike. You receive premium, but may be assigned and required to buy the shares even if the market price falls.",
    "Reserved cash is collateral, not available spending money.",
  ],
  [
    "Exercise & assignment",
    "Exercise is the long holder using their contract right. Assignment is the short seller being selected to fulfill the obligation. This simulator settles short positions at expiration and does not model early assignment.",
    "Real equity options can be assigned before expiration.",
  ],
];

export default function Learn() {
  const [open, setOpen] = useState(0);
  return (
    <AppShell>
      <div className="page-wrap">
        <div className="page-heading">
          <div>
            <span className="eyebrow">LEARNING CENTER</span>
            <h1>Build your options fluency</h1>
            <p className="subtitle">
              Short, practical lessons to make every simulated trade easier to
              understand.
            </p>
          </div>
        </div>
        <div className="learn-hero">
          <div>
            <span className="eyebrow">START HERE · 01</span>
            <h2>Options are a contract, not a shortcut.</h2>
            <p>
              Before you trade, learn the rights, obligations, and risks on both
              sides of a contract. Use the simulator to test an idea, then
              return to the payoff chart to see what changed.
            </p>
            <button
              className="button light"
              onClick={() =>
                document
                  .getElementById("call-lab")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore calls →
            </button>
          </div>
          <div className="lesson-orbit">
            <span>CALL</span>
            <b>
              OPTIONS
              <br />
              101
            </b>
            <span>PUT</span>
          </div>
        </div>
        <CallLesson />
        <LearnChat />
        <section className="lesson-grid">
          {lessons.map((lesson, i) => (
            <article
              className={open === i ? "lesson-card open" : "lesson-card"}
              id={i === 0 ? "lesson-1" : undefined}
              key={lesson[0]}
            >
              <button
                className="lesson-toggle"
                onClick={() => setOpen(open === i ? -1 : i)}
                aria-expanded={open === i}
              >
                <span className="lesson-number">0{i + 1}</span>
                <h3>{lesson[0]}</h3>
                <span className="lesson-chevron">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && (
                <div className="lesson-detail">
                  <p>{lesson[1]}</p>
                  <strong>Remember</strong>
                  <p>{lesson[2]}</p>
                </div>
              )}
            </article>
          ))}
        </section>
        <section className="sources" id="sources">
          <SectionHeader
            eyebrow="PRIMARY SOURCES"
            title="Go deeper, from the source"
          />
          <div className="source-links">
            <a
              href="https://www.fidelity.com/learning-center/investment-products/options/option-trading-instruction"
              target="_blank"
              rel="noreferrer"
            >
              <strong>Fidelity</strong>
              <span>Read an option order →</span>
            </a>
            <a
              href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-63"
              target="_blank"
              rel="noreferrer"
            >
              <strong>Investor.gov</strong>
              <span>Options basics →</span>
            </a>
            <a
              href="https://www.optionseducation.org"
              target="_blank"
              rel="noreferrer"
            >
              <strong>OIC</strong>
              <span>Options education →</span>
            </a>
            <a
              href="https://www.theocc.com/Company-Information/Documents-and-Archives/Options-Disclosure-Document"
              target="_blank"
              rel="noreferrer"
            >
              <strong>OCC</strong>
              <span>Disclosure document →</span>
            </a>
          </div>
          <p className="disclaimer">
            OptionLab is an educational simulator, not investment advice.
            Simulated results do not represent actual trading results.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
