import java .util.*;
class LinkedlistExample
{
	public static void main(String[]args)
	{
		Linkedlist<string>L1=new Linkedlist<>();
		L1.add("abc");
		L1.add("def");
		L1.add(1,"ghi");
		L1.addlast("mno");
		System.out.println(L1);
		Linkedlist<String>L2=new Linkedlist<>();
		L2.add("pqr");
		L2.add("stu");
		L1.addAll(2,L2);
		System.out.println(L1.contains("jkl"));
		System.out.println(L1.element());
		System.out.println(L1.get(3));
		System.out.println(L1.get(3));
		System.out.println(L1.getFirst());
		System.out.println(L1.getLast());
		System.out.println(L1.indexof("pqr"));
		System.out.println(L1.Lastindexof("ghi"));
		L1.offer("vw");
		L1.offerFirst("x");
		L1.offerLast("y");
		System.out.println(L1);
		System.out.println(L1.peek());
		System.out.println(L1.peekFirst());
		System.out.println(L1.peekLast());
		Systemout.println(L1.poll());
		System.out.println(L1.pollFirst());
		System.out.println(L1.pollLast());
		System.out.println(L1.pop());
		System.out.println(L1.pollh("2"));
		System.out.println(L1.remove());
		System.out.println(L1.remove(2));
		Sysrem.out.println(L1.remove("stu"));
		System.out.println(first());
		System.out.println(L1.removeLast());
		System.out.println(L1.removeFirstoccurance("pqr"));
		System.out.println(L1.removeLastoccurance("vw"));
		System.out.println(L1.size());
		System.out.println(L1.set(1,"xyz");
		System.out.println(L1.clear());
	}
}
