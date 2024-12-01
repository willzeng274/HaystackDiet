"use client";
import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
const loadGoogleMapsScript = (apiKey, callback) => {
  if (window.google) {
    callback();
    return;
  }

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.head.appendChild(script);
};

const AutoCompleteInput = ( { setCoordinates }: { setCoordinates: any } ) => {
  const autocompleteInputRef = useRef(null);

  useEffect(() => {
    loadGoogleMapsScript("AIzaSyAvOlJuETCUrg2fQcxYYH" + "5d8UTnOc2prv4", () => {
      const autocomplete = new window.google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        { types: ["geocode"] }
      );

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        console.log(place);
        if (!place.geometry) {
          console.log("Returned place contains no geometry");
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCoordinates([lat, lng]);
      });
    });
  }, []);

  return (
    <Input
      ref={autocompleteInputRef}
      type="text"
      placeholder="Enter a location"
    />
  );
};

export default AutoCompleteInput;