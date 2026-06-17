import { supabase } from "./supabase";

export async function getProducts() {
  const { data, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }

  return data;
}