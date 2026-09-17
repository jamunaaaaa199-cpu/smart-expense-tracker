import java.io;
class  DataInput
{
public static void main(String[] args)
{
BufferedReader br=new BufferedReder(new InputStreamReader(System.in));
System.out.println("enter an integer value:");
int a=Integer.parseInt(br.readLine());
System.out.println("Enter a float value:");
float b=Float.parseFloat(br.readLine());
System.out.println("Enter a Double Value:");
double c=Double.parseDouble(br.readLine());
System.out.println("Enter a Character value;");
char d=br.readLine().charAt(0);
System.out.println("Enter a String Value:");
String e=br.readLine();
System.out.println("\nEntered Values:");
System.out.println("Integer:"+a);
System.out.println("Float:"+b);
System.out.println("Double:"+c);
System.out.println("Character:"+d);
System.out.println("String:"+e);
}
}